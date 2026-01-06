// import { Field } from "payload";
import React, { useState, useEffect } from "react";

// Función para convertir minutos a HH:MM
const minutesToTime = (minutes: number) => {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Función para convertir HH:MM a minutos
const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const TimeNumberInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const [inputValue, setInputValue] = useState(minutesToTime(value));

  useEffect(() => {
    setInputValue(minutesToTime(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const minutes = timeToMinutes(e.target.value);
    onChange(minutes);
  };

  return (
    <input
      type="time"
      value={inputValue}
      onChange={handleChange}
      step={60} // opcional: pasos de 1 hora o 1 minuto
    />
  );
};
