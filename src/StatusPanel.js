import React from "react";
import { LABS } from "./constants";

const StatusPanel = ({ reservationsByDate, selectedLab, onLabSelect }) => {
  // 그래프 제거: 잔여 수량 계산 로직 불필요

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
    </div>
  );
};

export default StatusPanel;
