import React, { useState, useEffect, useRef } from 'react';

interface PerformanceModalProps {
  formData: {
    performance: string;
    hours: string;
    overtime: boolean;
    freeDay: boolean;
    startTime?: string; // e.g., "21:45"
    endTime?: string;   // e.g., "06:15"
  };
  defaultShift: 'morning' | 'evening' | 'night';
  onFormChange: (e: any) => void; // using "any" for synthetic events
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Computes the difference (in hours) between two times in "HH:mm" format.
 * If the end time is earlier than the start time, assumes the end time is on the next day.
 */
function computeHoursFromTimes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startDate = new Date(0, 0, 0, sh, sm);
  let endDate = new Date(0, 0, 0, eh, em);
  if (eh < sh) {
    endDate = new Date(0, 0, 1, eh, em); // assume next day
  }
  let diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return diff < 0 ? 0 : diff;
}

/**
 * Adds a given number of hours to a time string ("HH:mm") and returns the result in "HH:mm" format.
 */
function addHours(time: string, hoursToAdd: number): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const date = new Date(0, 0, 0, hour, minute);
  date.setHours(date.getHours() + hoursToAdd);
  const newHour = date.getHours().toString().padStart(2, '0');
  const newMinute = date.getMinutes().toString().padStart(2, '0');
  return `${newHour}:${newMinute}`;
}

/**
 * Determines a default sign‑in time based on the current local time.
 * Example boundaries:
 *   - If current time is between 05:45 and 14:15, default is "05:45" (morning)
 *   - If current time is between 13:45 and 22:15, default is "13:45" (evening)
 *   - Otherwise, default is "21:45" (night)
 */
function getDefaultStartTime(): string {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  const morningStart = 5 * 60 + 45;  
  const morningEnd = 14 * 60 + 15; 
  const eveningStart = 13 * 60 + 45; 
  const eveningEnd = 22 * 60 + 15; 
  if (totalMins >= morningStart && totalMins < morningEnd) {
    return "05:45";
  } else if (totalMins >= eveningStart && totalMins < eveningEnd) {
    return "13:45";
  } else {
    return "21:45";
  }
}

const PerformanceModal: React.FC<PerformanceModalProps> = ({
  formData,
  defaultShift,
  onFormChange,
  onSubmit,
  onClose,
}) => {
  // Create a ref for auto-focusing the performance input.
  const performanceInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    performanceInputRef.current?.focus();
  }, []);

  // On mount, if no sign‑in time is provided, set it to the default based on current time.
  useEffect(() => {
    if (!formData.startTime || formData.startTime.trim() === "") {
      const defaultStart = getDefaultStartTime();
      onFormChange({ target: { name: 'startTime', value: defaultStart } } as any);
    }
  }, [formData.startTime, onFormChange]);

  // Auto-set sign-out time if sign-in time is set and sign-out is empty.
  useEffect(() => {
    if (formData.startTime && (!formData.endTime || formData.endTime.trim() === "")) {
      const autoEnd = addHours(formData.startTime, 8);
      onFormChange({ target: { name: 'endTime', value: autoEnd } } as any);
      const hours = computeHoursFromTimes(formData.startTime, autoEnd);
      onFormChange({ target: { name: 'hours', value: hours.toFixed(2) } } as any);
    }
  }, [formData.startTime, formData.endTime, onFormChange]);

  // When sign-in time changes, update the sign-in time and auto-set sign-out time to 8 hours later.
  const handleStartTime = (newVal: string) => {
    onFormChange({ target: { name: 'startTime', value: newVal } } as any);
    const autoEnd = addHours(newVal, 8);
    onFormChange({ target: { name: 'endTime', value: autoEnd } } as any);
    const hours = computeHoursFromTimes(newVal, autoEnd);
    onFormChange({ target: { name: 'hours', value: hours.toFixed(2) } } as any);
  };

  // When sign-out time changes, update the sign-out time and recalc hours.
  const handleEndTime = (newVal: string) => {
    onFormChange({ target: { name: 'endTime', value: newVal } } as any);
    if (formData.startTime) {
      const hours = computeHoursFromTimes(formData.startTime, newVal);
      onFormChange({ target: { name: 'hours', value: hours.toFixed(2) } } as any);
    }
  };

  // Local form submission handler that includes the Easter egg.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { performance, hours, overtime, freeDay } = formData;
    const parsedPerformance = parseFloat(performance);
    const parsedHours = parseFloat(hours);
    
    // Easter egg: if performance is approximately 5.02, show the secret message.
    if (Math.abs(parsedPerformance - 5.02) < 0.001) {
      alert("Miro on botti");
    }
    
    if (isNaN(parsedPerformance)) {
      alert("Lisää suorite esim. 7.25");
      return;
    }
    if (isNaN(parsedHours) || parsedHours < 1 || parsedHours > 16) {
      alert("Työaika voi olla enintään 16 tuntia.");
      return;
    }
    
    // If all validations pass, call the parent's onSubmit.
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" lang="fi-FI">
      <div className="bg-white p-6 rounded text-black shadow-lg w-80">
        <h3 className="text-xl font-bold mb-4">Lisää suorite</h3>
        <form onSubmit={handleSubmit}>
          {/* SIGN-IN TIME */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Kirjautumisaika:</p>
            <input
              type="time"
              value={formData.startTime || ''}
              onChange={(e) => handleStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-lg focus:ring-2 focus:ring-secondary focus:outline-none"
              aria-label="Kirjautumisaika"
              step="60"
            />
          </div>

          {/* SIGN-OUT TIME */}
          <div className="mb-4">
            <p className="font-semibold mb-2">Kirjaudu ulos:</p>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => handleEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-lg focus:ring-2 focus:ring-secondary focus:outline-none"
              aria-label="Kirjaudu ulos"
              step="60"
            />
            <p className="text-xs text-black">
              Lisää aika, jolloin oman vuoron yli menevä työaika päättyy.
            </p>
          </div>

          {/* PERFORMANCE */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-black">Suorite:</label>
            <input
              ref={performanceInputRef}
              type="number"
              name="performance"
              value={formData.performance}
              onChange={onFormChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="mt-1 block w-full border border-black rounded-md"
              step="1"
              required
            />
          </div>

          {/* HOURS */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-black">Työtunnit:</label>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={onFormChange}
              className="mt-1 block w-full border border-black rounded-md"
              step="any"
              min="0"
              max="24"
              required
            />
          </div>

          {/* OVERTIME & FREE DAY */}
          <div className="mb-4 flex items-center">
            <label className="block text-sm font-medium text-black mr-2">Ylityö:</label>
            <input
              type="checkbox"
              name="overtime"
              checked={formData.overtime}
              onChange={onFormChange}
              className="h-4 w-4"
            />
          </div>
          <div className="mb-4 flex items-center">
            <label className="block text-sm font-medium text-black mr-2">Ylityö vapaapäivänä:</label>
            <input
              type="checkbox"
              name="freeDay"
              checked={formData.freeDay}
              onChange={onFormChange}
              className="h-4 w-4"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 bg-gray-300 text-black rounded"
            >
              Peruuta
            </button>
            <button type="submit" className="px-4 py-2 bg-secondary text-white rounded">
              Tallenna
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceModal;
