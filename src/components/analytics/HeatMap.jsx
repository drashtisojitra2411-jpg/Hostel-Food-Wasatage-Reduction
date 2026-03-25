import React from 'react';

export default function HeatMap({ data }) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const meals = ['Breakfast', 'Lunch', 'Dinner'];

    const getIntensityColor = (value) => {
        if (value > 80) return 'bg-red-500';
        if (value > 60) return 'bg-orange-400';
        if (value > 40) return 'bg-yellow-400';
        if (value > 20) return 'bg-green-400';
        return 'bg-green-200';
    };

    const getCellValue = (day, meal) => {
        const row = Array.isArray(data) ? data.find((x) => String(x.day || '').toLowerCase() === day.toLowerCase() && String(x.meal || '').toLowerCase() === meal.toLowerCase()) : null;
        return Number(row?.value || 0);
    };

    return (
        <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Wastage Heatmap</h3>
            <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                    <div className="grid grid-cols-8 gap-2">
                        <div className="col-span-1"></div>
                        {days.map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-500">{day}</div>
                        ))}

                        {meals.map((meal, rowIdx) => (
                            <React.Fragment key={meal}>
                                <div className="text-xs font-semibold text-gray-500 flex items-center justify-end pr-2">{meal}</div>
                                {days.map((day, colIdx) => {
                                    const val = getCellValue(day, meal);
                                    const delay = (rowIdx * 7 + colIdx) * 50;

                                    return (
                                        <div
                                            key={`${rowIdx}-${colIdx}`}
                                            className={`aspect-square rounded-md ${getIntensityColor(val)} hover:opacity-80 transition-opacity cursor-pointer animate-fade-in`}
                                            style={{ animationDelay: `${delay}ms` }}
                                            title={`${meal} - ${val}% Wastage`}
                                        ></div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
                <span>Low</span>
                <div className="w-16 h-2 rounded-full bg-gradient-to-r from-green-200 via-yellow-400 to-red-500"></div>
                <span>High</span>
            </div>
        </div>
    );
}
