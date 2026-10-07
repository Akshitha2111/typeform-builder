from typing import Any
from pydantic import BaseModel, field_validator

TYPES = {"short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating"}


class QuestionIn(BaseModel):
    text: str = "Untitled question"
    type: str = "short_text"
    required: bool = False
    description: str = ""
    options: list[str] = []

    @field_validator("type")
    @classmethod
    def valid_type(cls, v):
        if v not in TYPES:
            raise ValueError("invalid question type")
        return v

    @field_validator("options")
    @classmethod
    def clean_options(cls, v):
        return [o.strip() for o in v if o.strip()]


class FormIn(BaseModel):
    title: str


class ReorderIn(BaseModel):
    ids: list[int]


class AnswerIn(BaseModel):
    question_id: int
    value: Any = None


class SubmitIn(BaseModel):
    answers: list[AnswerIn]
