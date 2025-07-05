import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { generateTimeSlots } from './constants';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button } from 'react-bootstrap';

const Timetable = ({ studentId, authNumber, selectedLab, selectedDate }) => {
  const [reservations, setReservations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  const timeSlots = generateTimeSlots();
  const MAX_RESERVATIONS_PER_SLOT = 2;

  const fetchReservations = useCallback(async () => {
    if (!selectedDate || !selectedLab) return;

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', selectedDate)
      .eq('lab_id', selectedLab);

    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservations(data);
    }
  }, [selectedDate, selectedLab]);

  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel(`reservations:${selectedDate}:${selectedLab}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations', 
          filter: `date=eq.${selectedDate}`
        },
        (payload) => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservations, selectedDate, selectedLab]);

  const handleCardClick = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmReservation = async () => {
    if (!studentId || !authNumber) {
      alert('학번과 인증번호를 모두 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('reservations').insert([
      { 
        time_slot: selectedTimeSlot, 
        student_id: studentId,
        auth_number: authNumber, // 인증번호 추가
        date: selectedDate,
        lab_id: selectedLab
      }
    ]);

    if (error) {
      console.error('Error creating reservation:', error);
      if (error.code === '23505') { // Unique constraint violation
          alert('이미 이 시간대에 예약하셨습니다.');
      } else {
          alert('예약에 실패했습니다. 오류가 발생했습니다.');
      }
    } else {
      alert(`${selectedLab} ${selectedTimeSlot}에 예약되었습니다.`);
    }
    handleCloseModal();
  };

  const handleCancelReservation = async () => {
    if (!studentId || !authNumber) {
        alert('학번과 인증번호를 모두 입력해주세요.');
        return;
    }

    // 먼저 내가 한 예약이 맞는지 확인 (인증번호 포함)
    const { data: myReservation, error: fetchError } = await supabase
        .from('reservations')
        .select('id')
        .eq('time_slot', selectedTimeSlot)
        .eq('student_id', studentId)
        .eq('date', selectedDate)
        .eq('lab_id', selectedLab)
        .eq('auth_number', authNumber)
        .single();

    if (fetchError || !myReservation) {
        alert('인증번호가 일치하지 않거나 예약 정보를 찾을 수 없습니다.');
        return;
    }

    // 인증번호가 일치하면 삭제 진행
    const { error: deleteError } = await supabase.from('reservations').delete().match({ id: myReservation.id });
    
    if (deleteError) {
      console.error('Error canceling reservation:', deleteError);
      alert('예약 취소에 실패했습니다.');
    } else {
      alert(`${selectedLab} ${selectedTimeSlot} 예약이 취소되었습니다.`);
    }
    handleCloseModal();
  };

  const renderModalContent = () => {
    if (!selectedTimeSlot) return null;

    const reservationsForSlot = reservations.filter((r) => r.time_slot === selectedTimeSlot);
    const isMyReservation = reservationsForSlot.some((r) => r.student_id === studentId);
    const isFull = reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT;

    let modalBody, modalFooter;

    if (isMyReservation) {
        modalBody = <p>학번과 인증번호를 입력 후, 아래 버튼을 눌러 예약을 취소하세요.</p>;
        modalFooter = (
            <>
                <Button variant="secondary" onClick={handleCloseModal}>닫기</Button>
                <Button variant="danger" onClick={handleCancelReservation}>예약 취소하기</Button>
            </>
        );
    } else if (isFull) {
        modalBody = (
            <>
                <p>이 시간대는 예약이 모두 마감되었습니다.</p>
                <p><strong>예약자:</strong> {reservationsForSlot.map(r => r.student_id).join(', ')}</p>
            </>
        );
        modalFooter = <Button variant="secondary" onClick={handleCloseModal}>닫기</Button>;
    } else {
        modalBody = (
            <>
                <p>{selectedTimeSlot}에 예약하시겠습니까?</p>
                {reservationsForSlot.length > 0 && 
                    <p><strong>현재 예약자:</strong> {reservationsForSlot.map(r => r.student_id).join(', ')}</p>
                }
            </>
        );
        modalFooter = (
            <>
                <Button variant="secondary" onClick={handleCloseModal}>닫기</Button>
                <Button variant="primary" onClick={handleConfirmReservation}>예약하기</Button>
            </>
        );
    }

    return (
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedLab} - {selectedTimeSlot}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalBody}</Modal.Body>
        <Modal.Footer>{modalFooter}</Modal.Footer>
      </Modal>
    );
  };

  const getCardClass = (reservationsForSlot) => {
    const isMyReservation = reservationsForSlot.some(r => r.student_id === studentId);
    if (isMyReservation) return 'bg-success text-white'; // My reservation
    if (reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT) return 'bg-danger text-white'; // Full
    if (reservationsForSlot.length > 0) return 'bg-warning'; // Partially reserved
    return 'bg-light'; // Available
  };

  return (
    <div>
      <h2 className="text-center my-4">{selectedLab} 예약 현황</h2>
      <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-7 g-3">
        {timeSlots.map((timeSlot) => {
          const reservationsForSlot = reservations.filter((r) => r.time_slot === timeSlot);
          
          return (
            <div key={timeSlot} className="col">
              <div
                className={`card text-center h-100 ${getCardClass(reservationsForSlot)}`}
                onClick={() => handleCardClick(timeSlot)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body d-flex flex-column justify-content-center">
                  <h5 className="card-title mb-1">{timeSlot}</h5>
                  <p className="card-text small">({reservationsForSlot.length}/{MAX_RESERVATIONS_PER_SLOT})</p>
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
