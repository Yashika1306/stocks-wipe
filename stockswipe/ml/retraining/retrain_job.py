"""Weekly retraining pipeline: compute rewards → update all user bandit weights."""
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from ml.retraining.reward import compute_rewards
from ml.retraining.bandit_update import run_all_users

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def weekly_retrain() -> None:
    log.info("=== Weekly retrain started ===")
    log.info("Step 1: Computing rewards for matured swipes")
    rewards = compute_rewards()
    log.info(f"Step 1 done: {len(rewards)} rewards computed")

    log.info("Step 2: Updating user factor weights via Thompson sampling")
    run_all_users()
    log.info("=== Weekly retrain complete ===")


if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone="America/New_York")
    # Every Sunday at 2am ET
    scheduler.add_job(weekly_retrain, CronTrigger(day_of_week="sun", hour=2, minute=0))
    log.info("Retrain scheduler started (every Sunday 2am ET)")
    weekly_retrain()  # run immediately on start
    scheduler.start()
