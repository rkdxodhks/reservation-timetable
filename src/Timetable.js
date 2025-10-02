import React from "react";
import { generateTimeSlots, MAX_RESERVATIONS_PER_SLOT } from "./constants";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";

// A simple, self-contained SVG icon component for a user.
const UserIcon = ({ fill }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12ZM12 14C8.68629 14 6 16.6863 6 20H18C18 16.6863 15.3137 14 12 14Z" fill={fill}/>
  </svg>
);

const Timetable = ({
  studentId,
  selectedLab,
  reservations,
  currentReservationCount,
  onCardClick, // New prop from App.js
}) => {
  const timeSlots = generateTimeSlots();

  const handleCardClick = (timeSlot) => {
    const reservationsForSlot = reservations.filter(
      (r) => r.time_slot === timeSlot
    );

    // Block click only if user's limit is reached AND the slot is available
    if (currentReservationCount >= 2 && reservationsForSlot.length === 0) {
      toast.warning("예약은 최대 2회까지만 가능합니다.");
      return;
    }

    // For all other cases (my reservation, partially/fully booked slots), show the modal
    onCardClick(timeSlot, reservationsForSlot);
  };

  const getCardClass = (reservationsForSlot) => {
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    if (isMyReservation) return "mine";
    if (currentReservationCount >= 2 && !isMyReservation) return "disabled";
    if (reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT) return "full";
    if (reservationsForSlot.length > 0) return "partially";
    return "available";
  };

  const renderStatusIcons = (reservationsForSlot) => {
    const icons = [];
    const myReservation = reservationsForSlot.find(r => r.student_id === studentId);

    for (let i = 0; i < MAX_RESERVATIONS_PER_SLOT; i++) {
      const reservation = reservationsForSlot[i];
      let color = '#e5e7eb'; // Default empty color (light grey)

      if (reservation) {
        if (myReservation && reservation.student_id === myReservation.student_id) {
          color = '#34c759'; // Green for user's own reservation
        } else {
          color = '#1F4EF5'; // Blue for other's reservation
        }
      }
      icons.push(<UserIcon key={i} fill={color} />);
    }
    return <div className="d-flex justify-content-center">{icons}</div>;
  };

  return (
    <div className="p-3">
      <h2 className="text-center my-3">{selectedLab} 예약 현황</h2>
      <div className="row row-cols-2 row-cols-lg-3 g-3">
        {timeSlots.map((timeSlot) => {
          const reservationsForSlot = reservations.filter(
            (r) => r.time_slot === timeSlot
          );

          return (
            <div key={timeSlot} className="col">
              <div
                className={`card timetable-card text-center h-100 ${
                  getCardClass(reservationsForSlot)
                }`}
                onClick={() => handleCardClick(timeSlot)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body p-3 d-flex flex-row justify-content-between align-items-center">
                  <h5 className="card-title mb-0">{timeSlot.split(' ')[0]}</h5>
                  {renderStatusIcons(reservationsForSlot)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timetable;
