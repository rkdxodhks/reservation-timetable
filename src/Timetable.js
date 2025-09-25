import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { generateTimeSlots, MAX_RESERVATIONS_PER_SLOT } from "./constants";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

const Timetable = ({
  studentId,
  studentName,
  authNumber,
  selectedLab,
  selectedDate,
  reservations,
  onReservationUpdate,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  const timeSlots = generateTimeSlots();

  const handleCardClick = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (loading) return; // Don't close modal while loading
    setShowModal(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmReservation = async () => {
    if (!studentId || !studentName || !authNumber) {
      toast.error("학번, 이름, 인증번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 동일 학번 또는 이름의 해당 날짜 최대 2건 제한
      const { data: existing, error: countError } = await supabase
        .from("reservations")
        .select("id, student_id, student_name", { count: "exact", head: false })
        .eq("date", selectedDate);

      if (countError) {
        console.error("Error checking existing reservations:", countError);
      } else {
        const sameIdCount = existing.filter(
          (r) => r.student_id === studentId
        ).length;
        const sameNameCount = existing.filter(
          (r) => r.student_name === studentName
        ).length;
        if (sameIdCount >= 2 || sameNameCount >= 2) {
          toast.error(
            "동일 학번/이름의 해당 날짜 예약은 최대 2건까지 가능합니다."
          );
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("reservations").insert([
        {
          time_slot: selectedTimeSlot,
          student_id: studentId,
          student_name: studentName,
          auth_number: authNumber,
          date: selectedDate,
          lab_id: selectedLab,
        },
      ]);

      if (error) {
        console.error("Error creating reservation:", error);
        if (error.code === "23505") {
          toast.error("이미 이 시간대에 예약하셨습니다.");
        } else {
          toast.error("예약에 실패했습니다. 오류가 발생했습니다.");
        }
      } else {
        toast.success("예약이 완료되었습니다. 예약한 시간에 꼭 방문해 주세요.");
        onReservationUpdate(); // Notify App.js to refetch all data
      }
    } finally {
      setLoading(false);
      handleCloseModal();
    }
  };

  const handleCancelReservation = async () => {
    const MASTER_AUTH_NUMBER = process.env.REACT_APP_MASTER_AUTH_NUMBER;

    if (!studentId || !authNumber) {
      toast.error("학번과 인증번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      let reservationToCancel = reservations.find(
        (r) =>
          r.time_slot === selectedTimeSlot &&
          (r.student_id === studentId || authNumber === MASTER_AUTH_NUMBER)
      );

      if (!reservationToCancel) {
        const { data, error } = await supabase
          .from("reservations")
          .select("id")
          .eq("time_slot", selectedTimeSlot)
          .eq("date", selectedDate)
          .eq("lab_id", selectedLab)
          .limit(1)
          .single();
        if (error || !data) {
          toast.error("취소할 예약 정보를 찾을 수 없습니다.");
          return; // Early return will be caught by finally
        }
        reservationToCancel = { id: data.id }; // We only need the id for deletion
      }

      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .match({ id: reservationToCancel.id });

      if (deleteError) {
        console.error("Error canceling reservation:", deleteError);
        toast.error("예약 취소에 실패했습니다.");
      } else {
        toast.success(
          `${selectedLab} ${selectedTimeSlot} 예약이 취소되었습니다.`
        );
        onReservationUpdate(); // Notify App.js to refetch all data
      }
    } finally {
      setLoading(false);
      handleCloseModal();
    }
  };

  const renderModalContent = () => {
    if (!selectedTimeSlot) return null;

    const reservationsForSlot = reservations.filter(
      (r) => r.time_slot === selectedTimeSlot
    );
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    const isFull = reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT;

    let modalBody, modalFooter;

    if (isMyReservation) {
      modalBody = (
        <p>학번과 인증번호를 입력 후, 아래 버튼을 눌러 예약을 취소하세요.</p>
      );
      modalFooter = (
        <>
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelReservation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">취소 중...</span>
              </>
            ) : (
              "예약 취소하기"
            )}
          </Button>
        </>
      );
    } else if (isFull) {
      modalBody = (
        <>
          <p>이 시간대는 예약이 모두 마감되었습니다.</p>
          <p>
            <strong>예약자:</strong>{" "}
            {reservationsForSlot.map((r) => r.student_id).join(", ")}
          </p>
        </>
      );
      modalFooter = (
        <Button variant="secondary" onClick={handleCloseModal}>
          닫기
        </Button>
      );
    } else {
      modalBody = (
        <>
          <p>{selectedTimeSlot}에 예약하시겠습니까?</p>
          {reservationsForSlot.length > 0 && (
            <p>
              <strong>현재 예약자:</strong>{" "}
              {reservationsForSlot.map((r) => r.student_id).join(", ")}
            </p>
          )}
        </>
      );
      modalFooter = (
        <>
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReservation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">예약 중...</span>
              </>
            ) : (
              "예약하기"
            )}
          </Button>
        </>
      );
    }

    return (
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop={loading ? "static" : true}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedLab} - {selectedTimeSlot}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalBody}</Modal.Body>
        <Modal.Footer>{modalFooter}</Modal.Footer>
      </Modal>
    );
  };

  const getCardClass = (reservationsForSlot) => {
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    if (isMyReservation) return "bg-success"; // My reservation
    if (reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT)
      return "bg-danger"; // Full
    if (reservationsForSlot.length > 0) return "bg-warning"; // Partially reserved
    return "bg-light"; // Available
  };

  return (
    <div>
      <h2 className="text-center my-4">{selectedLab} 예약 현황</h2>
      <div className="row row-cols-1 row-cols-sm-1 row-cols-md-2 row-cols-lg-3 g-3">
        {timeSlots.map((timeSlot) => {
          const reservationsForSlot = reservations.filter(
            (r) => r.time_slot === timeSlot
          );

          return (
            <div key={timeSlot} className="col">
              <div
                className={`card text-center h-100 ${getCardClass(
                  reservationsForSlot
                )}`}
                onClick={() => handleCardClick(timeSlot)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body d-flex flex-column justify-content-center">
                  <h5 className="card-title mb-1">{timeSlot}</h5>
                  <p className="card-text small text-truncate">
                    {reservationsForSlot
                      .map((r) => r.student_name || r.student_id)
                      .join(", ") || "예약 가능"}
                  </p>
                  <p className="card-text small">
                    ({reservationsForSlot.length}/{MAX_RESERVATIONS_PER_SLOT})
                  </p>
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
