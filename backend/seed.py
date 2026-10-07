import random
from datetime import datetime, timedelta
import models as m


def make_form(db, title, qs, status="published"):
    f = m.Form(title=title, status=status, slug=m.make_slug(title))
    for i, (text, t, req, desc, opts) in enumerate(qs):
        f.questions.append(m.Question(text=text, type=t, position=i, required=req, description=desc, options=opts))
    db.add(f)
    db.commit()
    return f


def add_responses(db, f, n, gen):
    for k in range(n):
        r = m.Response(form_id=f.id, submitted_at=datetime.utcnow() - timedelta(hours=k * 5))
        for q in f.questions:
            r.answers.append(m.Answer(question_id=q.id, value=str(gen(q, k))))
        db.add(r)
    db.commit()


def seed(db):
    if db.query(m.Form).count():
        return
    names = ["Akshitha", "Rahul", "Priya", "Arjun", "Meera", "Kiran"]

    fb = make_form(db, "Customer Feedback", [
        ("What is your name?", "short_text", True, "", []),
        ("What is your email?", "email", True, "We'll only use it to follow up.", []),
        ("How would you rate us?", "rating", True, "1 is poor, 5 is great", []),
        ("Which language do you prefer?", "multiple_choice", False, "", ["Java", "Python", "JavaScript", "C++"]),
        ("Would you recommend us?", "yes_no", False, "", []),
        ("Any other feedback?", "long_text", False, "", []),
    ])

    def gen_fb(q, k):
        if q.type == "short_text": return names[k % 6]
        if q.type == "email": return f"{names[k % 6].lower()}@example.com"
        if q.type == "rating": return random.randint(3, 5)
        if q.type == "multiple_choice": return random.choice(q.options)
        if q.type == "yes_no": return random.choice(["Yes", "No"])
        return "Very good experience."
    add_responses(db, fb, 12, gen_fb)

    ev = make_form(db, "Event Registration", [
        ("Full name", "short_text", True, "", []),
        ("Age", "number", False, "", []),
        ("Which session will you attend?", "dropdown", True, "", ["Morning", "Afternoon", "Evening"]),
    ])

    def gen_ev(q, k):
        if q.type == "short_text": return names[k]
        if q.type == "number": return 20 + k
        return random.choice(q.options)
    add_responses(db, ev, 5, gen_ev)

    make_form(db, "Untitled Draft", [("Your favourite colour?", "short_text", False, "", [])], status="draft")