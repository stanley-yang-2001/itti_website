"""
Shared SQLAlchemy setup: Base class, engine, and session factory.
All model files import from here so they share one metadata object
and one connection.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # server/
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"  # swap for postgresql://... in production

engine = create_engine(DATABASE_URL, echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine)