import re, secrets
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


def make_slug(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:30] or "form"
    return f"{base}-{secrets.token_hex(2)}"


class Form(Base):
    __tablename__ = "forms"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    status = Column(String, default="draft")  # draft | published
    slug = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    questions = relationship("Question", cascade="all, delete-orphan", order_by="Question.position")
    responses = relationship("Response", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id"), index=True)
    text = Column(String, default="")
    type = Column(String, nullable=False)
    position = Column(Integer, default=0)
    required = Column(Boolean, default=False)
    description = Column(Text, default="")
    options = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id"), index=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    answers = relationship("Answer", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True)
    response_id = Column(Integer, ForeignKey("responses.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)
    value = Column(Text, default="")
