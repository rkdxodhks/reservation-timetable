import React from "react";
import { LABS } from "./constants";

const StatusPanel = ({
  reservationsByDate,
  selectedLab,
  onLabSelect,
  studentId,
  currentReservationCount,
}) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split("T")[0];

  const myReservations =
    studentId && reservationsByDate
      ? [...reservationsByDate.today, ...reservationsByDate.tomorrow].filter(
          (r) => r.student_id === studentId
        )
      : [];

  return (
    <div className="card p-3 mb-4 shadow-sm">
      <h5 className="card-title mb-3">운영중인 연구실 체험부스</h5>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {LABS.map((lab) => (
          <div key={lab} className="col">
            <div
              className={`card h-100 clickable-card ${
                selectedLab === lab ? "selected" : ""
              }`}
              onClick={() => onLabSelect(lab)}
            >
              <div className="card-body">
                <h6 className="card-subtitle mb-2 fw-bold">{lab}</h6>
                <p className="card-text small text-muted mb-0">
                  카드를 클릭하면 시간대를 선택할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {studentId && (
        <div className="mt-4 pt-3 border-top">
          <h6 className="mb-3">나의 예약 현황</h6>
          <div className="p-3 bg-light rounded mb-3">
            <p className="mb-0">
              <strong>현재 예약 횟수:</strong> {currentReservationCount}/2회
              {currentReservationCount >= 2 && (
                <span className="text-danger ms-2">
                  (최대 예약 횟수 도달)
                </span>
              )}
            </p>
          </div>

          {myReservations.length > 0 ? (
            <ul className="list-group">
              {myReservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="list-group-item list-group-item-success d-flex justify-content-between align-items-center"
                >
                  <div>
                    <span className="fw-bold">{reservation.lab_id}</span>
                    <small className="text-dark ms-2 fw-bold">
                      {reservation.date === todayStr
                        ? "11/11 (첫째날)"
                        : "11/12 (둘째날)"}{" "}
                      - {reservation.time_slot}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">예약 내역이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
