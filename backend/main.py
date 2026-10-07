import csv, io, re
from collections import Counter
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models as m, schemas as s
from database import Base, engine, get_db, SessionLocal
from seed import seed

Base.metadata.create_all(engine)
with SessionLocal() as _db:
    seed(_db)

app = FastAPI(title="Typeform Builder API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------
def q_out(q):
    return dict(id=q.id, text=q.text, type=q.type, position=q.position, required=q.required,
                description=q.description or "", options=q.options or [])


def f_out(f, full=False):
    d = dict(id=f.id, title=f.title, status=f.status, slug=f.slug,
             updated_at=f.updated_at.isoformat(), response_count=len(f.responses))
    if full:
        d["questions"] = [q_out(q) for q in f.questions]
    return d


def get_form(db, fid):
    f = db.get(m.Form, fid)
    if not f:
        raise HTTPException(404, "Form not found")
    return f


def validate(q, v):
    """Server-side validation; returns cleaned string or raises ValueError."""
    if v is None or str(v).strip() == "":
        if q.required:
            raise ValueError("Please answer this question.")
        return ""
    v = str(v).strip()
    if q.type == "email" and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
        raise ValueError("Please enter a valid email address.")
    if q.type == "number":
        try:
            float(v)
        except ValueError:
            raise ValueError("Please enter a valid number.")
    if q.type == "rating" and v not in {"1", "2", "3", "4", "5"}:
        raise ValueError("Please choose a rating from 1 to 5.")
    if q.type == "yes_no" and v not in {"Yes", "No"}:
        raise ValueError("Please choose Yes or No.")
    if q.type in {"multiple_choice", "dropdown"} and v not in (q.options or []):
        raise ValueError("Please choose one of the options.")
    return v


# ---------- forms ----------
@app.get("/forms")
def list_forms(db: Session = Depends(get_db)):
    forms = db.query(m.Form).order_by(m.Form.updated_at.desc()).all()
    return [f_out(f) for f in forms]


@app.post("/forms")
def create_form(body: s.FormIn, db: Session = Depends(get_db)):
    f = m.Form(title=body.title, slug=m.make_slug(body.title))
    f.questions.append(m.Question(text="What is your name?", type="short_text", position=0))
    db.add(f); db.commit(); db.refresh(f)
    return f_out(f, True)


@app.get("/forms/{fid}")
def read_form(fid: int, db: Session = Depends(get_db)):
    return f_out(get_form(db, fid), True)


@app.put("/forms/{fid}")
def rename_form(fid: int, body: s.FormIn, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    f.title = body.title
    db.commit()
    return f_out(f)


@app.delete("/forms/{fid}")
def delete_form(fid: int, db: Session = Depends(get_db)):
    db.delete(get_form(db, fid)); db.commit()
    return {"ok": True}


@app.post("/forms/{fid}/duplicate")
def duplicate_form(fid: int, db: Session = Depends(get_db)):
    src = get_form(db, fid)
    title = f"{src.title} Copy"
    f = m.Form(title=title, slug=m.make_slug(title))
    for q in src.questions:
        f.questions.append(m.Question(text=q.text, type=q.type, position=q.position, required=q.required,
                                      description=q.description, options=q.options))
    db.add(f); db.commit()
    return f_out(f)


@app.post("/forms/{fid}/publish")
def publish(fid: int, db: Session = Depends(get_db)):
    f = get_form(db, fid); f.status = "published"; db.commit()
    return f_out(f)


@app.post("/forms/{fid}/unpublish")
def unpublish(fid: int, db: Session = Depends(get_db)):
    f = get_form(db, fid); f.status = "draft"; db.commit()
    return f_out(f)


# ---------- questions ----------
@app.post("/forms/{fid}/questions")
def add_question(fid: int, body: s.QuestionIn, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    q = m.Question(form_id=fid, position=len(f.questions), **body.model_dump())
    db.add(q); db.commit(); db.refresh(q)
    return q_out(q)


@app.put("/forms/{fid}/questions/reorder")
def reorder(fid: int, body: s.ReorderIn, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    by_id = {q.id: q for q in f.questions}
    for pos, qid in enumerate(body.ids):
        if qid in by_id:
            by_id[qid].position = pos
    db.commit()
    return {"ok": True}


@app.put("/questions/{qid}")
def update_question(qid: int, body: s.QuestionIn, db: Session = Depends(get_db)):
    q = db.get(m.Question, qid)
    if not q:
        raise HTTPException(404, "Question not found")
    for k, v in body.model_dump().items():
        setattr(q, k, v)
    db.commit()
    return q_out(q)


@app.delete("/questions/{qid}")
def delete_question(qid: int, db: Session = Depends(get_db)):
    q = db.get(m.Question, qid)
    if not q:
        raise HTTPException(404, "Question not found")
    fid = q.form_id
    db.query(m.Answer).filter_by(question_id=qid).delete()
    db.delete(q); db.commit()
    for i, x in enumerate(db.query(m.Question).filter_by(form_id=fid).order_by(m.Question.position)):
        x.position = i
    db.commit()
    return {"ok": True}


# ---------- public respondent ----------
@app.get("/public/forms/{slug}")
def public_form(slug: str, db: Session = Depends(get_db)):
    f = db.query(m.Form).filter_by(slug=slug).first()
    if not f:
        raise HTTPException(404, "Form not found")
    if f.status != "published":
        raise HTTPException(403, "This form is no longer accepting responses.")
    return f_out(f, True)


@app.post("/public/forms/{slug}/responses")
def submit(slug: str, body: s.SubmitIn, db: Session = Depends(get_db)):
    f = db.query(m.Form).filter_by(slug=slug).first()
    if not f or f.status != "published":
        raise HTTPException(403, "This form is no longer accepting responses.")
    given = {a.question_id: a.value for a in body.answers}
    errors, clean = {}, {}
    for q in f.questions:
        try:
            clean[q.id] = validate(q, given.get(q.id))
        except ValueError as e:
            errors[q.id] = str(e)
    if errors:
        raise HTTPException(422, errors)
    r = m.Response(form_id=f.id)
    r.answers = [m.Answer(question_id=qid, value=v) for qid, v in clean.items()]
    db.add(r); db.commit()
    return {"id": r.id}


# ---------- results ----------
@app.get("/forms/{fid}/responses")
def responses(fid: int, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    rs = sorted(f.responses, key=lambda r: r.submitted_at, reverse=True)
    return [dict(id=r.id, submitted_at=r.submitted_at.isoformat(),
                 answers={a.question_id: a.value for a in r.answers}) for r in rs]


@app.get("/forms/{fid}/summary")
def summary(fid: int, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    out = []
    for q in f.questions:
        vals = [a.value for r in f.responses for a in r.answers if a.question_id == q.id and a.value != ""]
        item = dict(question_id=q.id, text=q.text, type=q.type, answered=len(vals))
        if q.type in {"multiple_choice", "dropdown", "yes_no", "rating"}:
            c = Counter(vals)
            keys = q.options if q.type in {"multiple_choice", "dropdown"} else (
                ["Yes", "No"] if q.type == "yes_no" else ["1", "2", "3", "4", "5"])
            item["counts"] = {k: c.get(k, 0) for k in keys}
            if q.type == "rating" and vals:
                item["average"] = round(sum(map(int, vals)) / len(vals), 2)
        out.append(item)
    return dict(total=len(f.responses), questions=out)


@app.get("/forms/{fid}/export.csv")
def export_csv(fid: int, db: Session = Depends(get_db)):
    f = get_form(db, fid)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["Submitted at"] + [q.text for q in f.questions])
    for r in f.responses:
        a = {x.question_id: x.value for x in r.answers}
        w.writerow([r.submitted_at.isoformat()] + [a.get(q.id, "") for q in f.questions])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename=form-{fid}.csv"})
