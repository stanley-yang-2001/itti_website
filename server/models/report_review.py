"""
ReportReview model and the peer-review decision workflow.

One row per (report, reviewer, version) - a reviewer can cast exactly
one decision per version of a report, but a NEW version (after the
uploader resubmits following changes_requested) can be reviewed again
from scratch, since the file/description actually changed.

record_review() is the single entry point that enforces every rule in
one place:
  - the uploader cannot review their own report
  - a reviewer cannot submit twice for the same version (they can
    change their mind by calling record_review() again, which updates
    their existing row rather than creating a duplicate)
  - a reject requires a comment; sets review_status to
    changes_requested immediately
  - an approve recount happens after every approval; the 3rd distinct
    approval at the current version auto-publishes the report
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint

from .database import Base, Session
from .report import (
    Report, REQUIRED_APPROVALS, get_author_name,
    REVIEW_STATUS_PUBLISHED, REVIEW_STATUS_CHANGES_REQUESTED, REVIEW_STATUS_PENDING,
)

DECISION_APPROVE = "approve"
DECISION_REJECT = "reject"


class ReportReview(Base):
    __tablename__ = "report_reviews"
    __table_args__ = (
        UniqueConstraint("report_id", "reviewer_id", "version", name="uq_report_reviewer_version"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False)

    decision = Column(String, nullable=False)
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_public_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "reviewer_id": self.reviewer_id,
            "reviewer_name": get_author_name(self.reviewer_id),
            "version": self.version,
            "decision": self.decision,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ReviewError(ValueError):
    """Raised for any rule violation in record_review() - message is always safe to show the reviewer."""


def record_review(report_id, reviewer_id, decision, comment=None):
    """
    Records a reviewer's decision on a report's CURRENT version, then
    applies the resulting workflow transition:
      - reject (comment required) -> review_status = changes_requested
      - approve -> if this is now the 3rd distinct approval at the
        current version, review_status = published

    Raises ReviewError (safe, user-facing message) on any rule
    violation. Returns the updated Report.
    """
    session = Session()
    try:
        report = session.query(Report).filter(Report.id == report_id).first()
        if report is None:
            raise ReviewError("Report not found.")

        if report.review_status != REVIEW_STATUS_PENDING:
            raise ReviewError("This report isn't currently awaiting review.")

        if report.uploaded_by == reviewer_id:
            raise ReviewError("You cannot review your own submission.")

        if decision not in (DECISION_APPROVE, DECISION_REJECT):
            raise ReviewError("Decision must be 'approve' or 'reject'.")

        if decision == DECISION_REJECT and not (comment and comment.strip()):
            raise ReviewError("A comment is required when requesting changes.")

        existing = (
            session.query(ReportReview)
            .filter(
                ReportReview.report_id == report_id,
                ReportReview.reviewer_id == reviewer_id,
                ReportReview.version == report.version,
            )
            .first()
        )
        if existing is not None:
            existing.decision = decision
            existing.comment = comment
            existing.created_at = datetime.utcnow()
        else:
            session.add(ReportReview(
                report_id=report_id,
                reviewer_id=reviewer_id,
                version=report.version,
                decision=decision,
                comment=comment,
            ))
        session.commit()

        if decision == DECISION_REJECT:
            report.review_status = REVIEW_STATUS_CHANGES_REQUESTED
            session.commit()
        else:
            approval_count = (
                session.query(ReportReview)
                .filter(
                    ReportReview.report_id == report_id,
                    ReportReview.version == report.version,
                    ReportReview.decision == DECISION_APPROVE,
                )
                .count()
            )
            if approval_count >= REQUIRED_APPROVALS:
                report.review_status = REVIEW_STATUS_PUBLISHED
                session.commit()

        session.refresh(report)
        return report
    finally:
        session.close()


def get_reviews_for_report(report_id, version=None):
    """Returns all ReportReview rows for a report, newest first, optionally scoped to one version."""
    session = Session()
    try:
        query = session.query(ReportReview).filter(ReportReview.report_id == report_id)
        if version is not None:
            query = query.filter(ReportReview.version == version)
        return query.order_by(ReportReview.created_at.desc()).all()
    finally:
        session.close()


def get_approval_count(report_id, version):
    """Returns the number of distinct approvals for a report at a specific version."""
    session = Session()
    try:
        return (
            session.query(ReportReview)
            .filter(
                ReportReview.report_id == report_id,
                ReportReview.version == version,
                ReportReview.decision == DECISION_APPROVE,
            )
            .count()
        )
    finally:
        session.close()


def get_reviewer_decision(report_id, reviewer_id, version):
    """Returns this reviewer's existing decision for a report's current version, or None if they haven't reviewed it yet."""
    session = Session()
    try:
        review = (
            session.query(ReportReview)
            .filter(
                ReportReview.report_id == report_id,
                ReportReview.reviewer_id == reviewer_id,
                ReportReview.version == version,
            )
            .first()
        )
        return review.decision if review else None
    finally:
        session.close()