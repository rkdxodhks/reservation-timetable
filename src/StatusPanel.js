import React from 'react';
import { LABS, generateTimeSlots, MAX_RESERVATIONS_PER_SLOT } from './constants';

const StatusPanel = ({ reservationsByDate, selectedLab, onLabSelect }) => {
  const timeSlots = generateTimeSlots();
  const totalSlots = timeSlots.length * MAX_RESERVATIONS_PER_SLOT;

  const getRemainingSlots = (lab, dateKey) => {
    const reservations = reservationsByDate[dateKey] || [];
    const labReservations = reservations.filter(r => r.lab_id === lab).length;
    return totalSlots - labReservations;
  };

  return (
    <div className="card p-3 mb-4 shadow-sm">
      <h5 className="card-title mb-3">실시간 실험실 현황</h5>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {LABS.map(lab => (
          <div key={lab} className="col">
            <div 
              className={`card h-100 clickable-card ${selectedLab === lab ? 'selected' : ''}`}
              onClick={() => onLabSelect(lab)}
            >
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">{lab}</h6>
                <p className="card-text mb-1">
                  <span className="badge-container bg-light w-100 d-flex justify-content-between align-items-center position-relative">
                    <div className="progress-bar bg-pastel-blue" style={{ width: `${(getRemainingSlots(lab, 'today') / totalSlots) * 100}%` }}></div>
                    <span className="text-dark fw-bold z-1">첫째날:</span>
                    <span className="text-dark fw-bold z-1">{getRemainingSlots(lab, 'today')} / {totalSlots}</span>
                  </span>
                </p>
                <p className="card-text">
                  <span className="badge-container bg-light w-100 d-flex justify-content-between align-items-center position-relative">
                    <div className="progress-bar bg-pastel-gray" style={{ width: `${(getRemainingSlots(lab, 'tomorrow') / totalSlots) * 100}%` }}></div>
                    <span className="text-dark fw-bold z-1">둘째날:</span>
                    <span className="text-dark fw-bold z-1">{getRemainingSlots(lab, 'tomorrow')} / {totalSlots}</span>
                  </span>
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
