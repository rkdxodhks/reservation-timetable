import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button } from 'react-bootstrap';

const Timetable = ({ studentId }) => {
  const [reservations, setReservations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const timeSlots = Array.from({ length: 10 }, (_, i) => `${i + 9}:00`); // 9:00 to 18:00

  useEffect(() => {
    fetchReservations();

    const subscription = supabase
      .channel('reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        fetchReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) console.error('Error fetching reservations:', error);
    else setReservations(data);
  };

  const handleCardClick = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmReservation = async () => {
    if (!studentId) {
      alert('학번을 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('reservations').insert([{ time_slot: selectedTimeSlot, student_id: studentId }]);
    if (error) {
      console.error('Error creating reservation:', error);
      alert('예약에 실패했습니다. 이미 예약되었거나 오류가 발생했습니다.');
    } else {
      alert(`${selectedTimeSlot}에 예약되었습니다.`);
    }
    handleCloseModal();
  };

  const handleCancelReservation = async () => {
    const existingReservation = reservations.find((r) => r.time_slot === selectedTimeSlot && r.student_id === studentId);
    if (existingReservation) {
      const { error } = await supabase.from('reservations').delete().match({ id: existingReservation.id });
      if (error) {
        console.error('Error canceling reservation:', error);
        alert('예약 취소에 실패했습니다.');
      } else {
        alert(`${selectedTimeSlot} 예약이 취소되었습니다.`);
      }
    }
    handleCloseModal();
  };

  const renderModalContent = () => {
    if (!selectedTimeSlot) return null;

    const reservation = reservations.find((r) => r.time_slot === selectedTimeSlot);
    const isReserved = !!reservation;
    const isMyReservation = reservation && reservation.student_id === studentId;

    return (
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedTimeSlot} 예약</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isReserved ? (
            isMyReservation ? (
              <>
                <p>현재 {selectedTimeSlot}은(는) 당신의 학번({studentId})으로 예약되어 있습니다.</p>
                <p>예약을 취소하시겠습니까?</p>
              </>
            ) : (
              <>
                <p>현재 {selectedTimeSlot}은(는) 다른 사용자({reservation.student_id})에 의해 예약되어 있습니다.</p>
                <p>예약할 수 없습니다.</p>
              </>
            )
          ) : (
            <>
              <p>{selectedTimeSlot}에 예약하시겠습니까?</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            닫기
          </Button>
          {isReserved ? (
            isMyReservation && (
              <Button variant="danger" onClick={handleCancelReservation}>
                예약 취소하기
              </Button>
            )
          ) : (
            <Button variant="primary" onClick={handleConfirmReservation}>
              예약하기
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    );
  };

  return (
    <div>
      <h2 className="text-center my-4">타임테이블</h2>
      <div className="row">
        {timeSlots.map((timeSlot) => {
          const reservation = reservations.find((r) => r.time_slot === timeSlot);
          const isReserved = !!reservation;
          const isMyReservation = reservation && reservation.student_id === studentId;

          return (
            <div key={timeSlot} className="col-md-3 mb-3">
              <div
                className={`card text-center ${isReserved ? (isMyReservation ? 'bg-success text-white' : 'bg-danger text-white') : 'bg-light'}`}
                onClick={() => handleCardClick(timeSlot)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body">
                  <h5 className="card-title">{timeSlot}</h5>
                  <p className="card-text">{isReserved ? reservation.student_id : '-'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {renderModalContent()}
    </div>
  );
};

export default Timetable;