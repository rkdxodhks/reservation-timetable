export const LABS = [
  '분자생물실험실',
  '고분자콜로이드실험실',
  '고분자약물전달실험실',
  '생체소재 및 대사질환실험실',
  '바이오의약소재실험실',
  '나노인공세포연구실',
];

export const generateTimeSlots = () => {
  const slots = [];
  // 오전: 10:00, 10:20 (10:30 제외)
  slots.push('10:00', '10:20');

  // 오전: 10:40 ~ 11:40 (20분 간격)
  for (let i = 40; i <= 100; i += 20) {
      const hour = Math.floor(10 + i / 60);
      const minute = i % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }

  // 오후: 14:00 ~ 15:20 (20분 간격, 12:00-13:45 점심시간 제외)
  for (let i = 0; i <= 80; i += 20) {
      const hour = Math.floor(14 + i / 60);
      const minute = i % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return slots;
};
