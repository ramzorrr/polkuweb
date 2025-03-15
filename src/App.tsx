// App.tsx
import { DateData, DailyData, computePerformancePercentage, calculateAverage, calculatePercentage } from './utils';
import React, { useState, useEffect } from 'react';
import Calendar, { CalendarProps } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './tailwind.css';
import './customCalendar.css';
import Tavoite from './Tavoite';
import Multiplier from './Multiplier';
import MeatCalculator from './MeatCalculator';
import PerformanceModal from './PerformanceModal';
import localforage from 'localforage';
import { migrateOldData } from './migration';

const App = () => {
  // Data now maps date strings to DailyData objects.
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<{ [key: string]: DailyData }>({});
  const [period, setPeriod] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [autoShift, setAutoShift] = useState<'morning' | 'evening' | 'night'>('morning');

  // Added "trukki" flag in form state.
  const [formData, setFormData] = useState({
    performance: '',
    hours: '8',
    overtime: false,
    freeDay: false,
    startTime: '',
    endTime: '',
    trukki: false,
  });

  function getOngoingShift(): 'morning' | 'evening' | 'night' {
    const now = new Date();
    const hr = now.getHours();
    const min = now.getMinutes();
    const totalMins = hr * 60 + min;
    const timeToMins = (h: number, m: number) => h * 60 + m;
    const morningStart = timeToMins(5, 45);
    const morningEnd = timeToMins(14, 15);
    const eveningStart = timeToMins(13, 45);
    const eveningEnd = timeToMins(22, 15);
    const inRange = (t: number, start: number, end: number) => t >= start && t < end;
    if (inRange(totalMins, morningStart, morningEnd)) return 'morning';
    if (inRange(totalMins, eveningStart, eveningEnd)) return 'evening';
    return 'night';
  }

  function getPeriodForDate(d: Date) {
    const day = d.getDate();
    return day >= 1 && day <= 15 ? 'Jakso 1' : 'Jakso 2';
  }

  const handleAddSuorite = () => {
    const shiftNow = getOngoingShift();
    setAutoShift(shiftNow);
    setShowModal(true);
  };

  useEffect(() => {
    localforage
      .getItem('calendarData')
      .then((storedData) => {
        if (storedData) {
          const migratedData = migrateOldData(storedData as { [key: string]: any });
          setData(migratedData);
        }
      })
      .catch((err) => console.error('Error retrieving calendarData:', err));
  }, [date]);
  
  useEffect(() => {
    localforage
      .getItem('calendarData')
      .then((storedData) => {
        if (storedData) {
          setData(storedData as { [key: string]: DailyData });
        }
      })
      .catch((err) => console.error('Error retrieving calendarData:', err));
  }, [date]);

  useEffect(() => {
    localforage.setItem('calendarData', data).catch((err) =>
      console.error('Error saving calendarData:', err)
    );
  }, [data]);

  useEffect(() => {
    setPeriod(getPeriodForDate(date));
  }, [date]);

  const onChange: CalendarProps['onChange'] = (value) => {
    let newDate: Date | null = null;
    if (value instanceof Date) {
      newDate = value;
    } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof Date) {
      newDate = value[0];
    }
    if (newDate) {
      setDate(newDate);
      const day = newDate.getDate();
      setPeriod(day >= 1 && day <= 15 ? 'Jakso 1' : 'Jakso 2');
    } else {
      console.log('Invalid or no date selected');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { performance, hours, overtime, freeDay, trukki } = formData;
    const parsedPerformance = parseFloat(performance);
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedPerformance)) {
      alert("Lisää suorite esim. 7.25");
      return;
    }
    if (isNaN(parsedHours) || parsedHours < 0 || parsedHours > 16) {
      alert("Lisää aika väliltä 0-16");
      return;
    }
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setData((prevData) => {
      const dayData: DailyData = prevData[dateString] || {};
      if (trukki) {
        dayData.forklift = {
          performance: parsedPerformance,
          hours: parsedHours,
          overtime,
          freeDay,
        };
      } else {
        dayData.normal = {
          performance: parsedPerformance,
          hours: parsedHours,
          overtime,
          freeDay,
        };
      }
      return { ...prevData, [dateString]: dayData };
    });
    setShowModal(false);
    setFormData({
      performance: '',
      hours: '8',
      overtime: false,
      freeDay: false,
      startTime: '',
      endTime: '',
      trukki: false,
    });
  };

  const handleDeleteData = () => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setData((prevData) => {
      const newData = { ...prevData };
      delete newData[dateString];
      return newData;
    });
  };

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  const filterDates = (d: Date): boolean => {
    const day = d.getDate();
    return period === 'Jakso 1' ? day >= 1 && day <= 15 : day >= 16;
  };

  // Averages for the calendar slider (using normal data by default)
  const overallAverageNormal = parseFloat(calculateAverage(data, filterDates, 'normal'));
  const overallAveragePercentageNormal = calculatePercentage(overallAverageNormal);
  const overallAverageForklift = parseFloat(calculateAverage(data, filterDates, 'forklift'));
  const overallAveragePercentageForklift = calculatePercentage(overallAverageForklift);

  const selectedDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const selectedDayData = data[selectedDateString] || {};

  // When both normal and forklift exist, the original logic for break deduction is not used in the tile.
  // Instead, we simply call computePerformancePercentage with the entry.
  return (
    <div className="bg-primary min-h-screen text-gray-100 flex flex-col items-center p-4">
      <h2 className="text-secondary text-2xl font-bold mb-2">Suoritelaskuri</h2>
      
      {/* Calendar – All dates are now clickable */}
      <div className="bg-primary p-4 rounded-lg shadow-lg calendar-container">
        <Calendar
          onChange={onChange}
          value={date}
          locale="fi-FI"
          tileContent={({ date: tileDate, view }) => {
            const dateString = `${tileDate.getFullYear()}-${String(tileDate.getMonth() + 1).padStart(2, '0')}-${String(
              tileDate.getDate()
            ).padStart(2, '0')}`;
            if (view === 'month' && data[dateString]) {
              const dayData = data[dateString];
              let indicators = [];
              if (dayData.normal) {
                indicators.push(
                  <div key="normal" style={{ color: 'black', fontSize: '10px', marginRight: '2px' }}>
                    {computePerformancePercentage(dayData.normal)}%
                  </div>
                );
              }
              if (dayData.forklift) {
                indicators.push(
                  <div key="forklift" style={{ color: 'black', fontSize: '9px', marginRight: '2px' }}>
                    {computePerformancePercentage(dayData.forklift)}%
                  </div>
                );
              }
              return <div>{indicators}</div>;
            }
            return null;
          }}
          tileClassName={({ date: tileDate, view }) => {
            if (view !== 'month') return '';
            const classes: string[] = [];
            if (tileDate.toDateString() === date.toDateString()) {
              classes.push('selected-tile');
            } else if (filterDates(tileDate)) {
              classes.push('currentPeriod');
            }
            const dateString = `${tileDate.getFullYear()}-${String(tileDate.getMonth() + 1).padStart(2, '0')}-${String(
              tileDate.getDate()
            ).padStart(2, '0')}`;
            if (data[dateString]) {
              classes.push('highlight');
            }
            return classes.join(' ');
          }}
        />
      </div>
      <div className="flex space-x-4 mt-4">
        <button onClick={handleAddSuorite} className="bg-secondary text-white px-4 py-2 rounded">
          Lisää suorite
        </button>
        <button onClick={handleDeleteData} className="bg-red-600 text-white px-4 py-2 rounded">
          Poista suorite
        </button>
      </div>

      {(selectedDayData.normal || selectedDayData.forklift) && (
        <div className="mt-4 p-4 bg-gray-800 text-white rounded shadow-lg">
          <h3 className="text-lg font-bold">{formatDate(selectedDateString)}</h3>
          {selectedDayData.normal && (
            <p>
              Keräyssuorite: {selectedDayData.normal.performance} ({computePerformancePercentage(selectedDayData.normal)}%) {selectedDayData.normal.hours} tunnissa ({selectedDayData.normal.overtime || selectedDayData.normal.freeDay ? 'ylityö' : 'normaali'})
            </p>
          )}
          {selectedDayData.forklift && (
            <p>
              Trukkisuorite: {selectedDayData.forklift.performance} ({computePerformancePercentage(selectedDayData.forklift)}%) {selectedDayData.forklift.hours} tunnissa ({selectedDayData.forklift.overtime || selectedDayData.forklift.freeDay ? 'ylityö' : 'normaali'})
            </p>
          )}
        </div>
      )}

      <Tavoite data={data} period={period} selectedDate={date} />

      {showModal && (
        <PerformanceModal
          formData={formData}
          onFormChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onClose={() => setShowModal(false)}
          defaultShift={autoShift}
        />
      )}
    </div>
  );
};

export default App;
