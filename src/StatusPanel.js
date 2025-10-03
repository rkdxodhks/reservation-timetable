import React from "react";
import { LABS } from "./constants";

export const LabsList = ({ selectedLab, onLabSelect }) => (
  <div className="mb-3">
    <h4 className="card-title mb-2">연구실 선택</h4>
    <div className="pill-filter-container">
      {LABS.map((lab) => (
        <div
          key={lab}
          className={`pill-filter ${selectedLab === lab ? "active" : ""}`}
          onClick={() => onLabSelect(lab)}
        >
          {lab}
        </div>
      ))}
    </div>
  </div>
);

export const MyReservations = ({
  studentId,
  reservationsByDate,
  currentReservationCount,
  onReservationClick, // New prop
  todayStr,
}) => {
  const myReservations =
    studentId && reservationsByDate
      ? [...reservationsByDate.today, ...reservationsByDate.tomorrow].filter(
          (r) => r.student_id === studentId
        )
      : [];

  return (
    <div className="mt-3">
      <h5 className="card-title mb-3">나의 예약 현황</h5>
      {!studentId ? (
        <p className="text-muted small">학번을 입력하면 예약 현황이 표시됩니다.</p>
      ) : (
        <>
          <div className="p-3 bg-light rounded mb-3">
            <p className="mb-0">
              <strong>현재 예약 횟수:</strong> [{currentReservationCount}/2]
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
                  className="list-group-item list-group-item-success d-flex justify-content-between align-items-center clickable-card"
                  onClick={() => onReservationClick(reservation)} // Added onClick
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
                  <span className="badge bg-danger rounded-pill">취소</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">예약 내역이 없습니다.</p>
          )}
        </>
      )}
    </div>
  );
};
