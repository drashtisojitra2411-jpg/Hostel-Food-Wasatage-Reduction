import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const MealContext = createContext({});

export const useMeals = () => useContext(MealContext);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

function normalizeMenuName(name, mealType) {
    const raw = String(name || '').trim();
    const timeOnlyPattern = /^\d{1,2}:\d{2}(:\d{2})?(\s*-\s*\d{1,2}:\d{2}(:\d{2})?)?$/;

    if (!raw || timeOnlyPattern.test(raw)) {
        if (mealType === 'breakfast') return 'Chef Special Breakfast';
        if (mealType === 'lunch') return 'Chef Special Lunch';
        if (mealType === 'dinner') return 'Chef Special Dinner';
        return 'Chef Special Meal';
    }

    return raw;
}

function getWeekDates(date = new Date()) {
    const base = new Date(date);
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
}

function createDefaultMenuMap() {
    const defaults = {};
    for (const d of DAYS) {
        for (const m of MEAL_TYPES) {
            defaults[`${d}_${m}`] = {
                id: null,
                meal_id: null,
                name: 'NOT SCHEDULED',
                vote_count: 0,
                used_default: true
            };
        }
    }
    return defaults;
}

export function MealProvider({ children }) {
    const [mealOptions, setMealOptions] = useState(null);
    const [finalizedMenu, setFinalizedMenu] = useState(createDefaultMenuMap());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [voterCount, setVoterCount] = useState(0);
    const [votingStatus, setVotingStatus] = useState('FINALIZED');

    const { monday } = getWeekDates();
    const weekKey = monday.toISOString().slice(0, 10);

    const loadMealData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.get(`/api/finalized-menu?week_start=${weekKey}`);
            const mapFromApi = data?.menu_map && typeof data.menu_map === 'object' ? data.menu_map : {};
            const normalizedFromApi = {};
            for (const key of Object.keys(mapFromApi)) {
                const slot = mapFromApi[key] || {};
                normalizedFromApi[key] = {
                    ...slot,
                    name: normalizeMenuName(slot.name, slot.meal_type)
                };
            }
            const merged = {
                ...createDefaultMenuMap(),
                ...normalizedFromApi
            };

            const optionMap = {};
            for (const d of DAYS) {
                optionMap[d] = {};
                for (const m of MEAL_TYPES) {
                    const slot = merged[`${d}_${m}`];
                    optionMap[d][m] = [{
                        id: slot?.id || `${d}-${m}`,
                        name: slot?.name || 'NOT SCHEDULED'
                    }];
                }
            }

            setMealOptions(optionMap);
            setFinalizedMenu(merged);
            setVoterCount(Number(data?.voter_count) || 0);
            setVotingStatus('FINALIZED');
        } catch (err) {
            setError(err.message || 'Failed to fetch finalized menu');
            setMealOptions(null);
            setFinalizedMenu(createDefaultMenuMap());
            setVoterCount(0);
            setVotingStatus('FINALIZED');
        } finally {
            setLoading(false);
        }
    }, [weekKey]);

    useEffect(() => {
        loadMealData();
    }, [loadMealData]);

    const value = {
        mealOptions,
        finalizedMenu,
        loading,
        error,
        voterCount,
        votingStatus,
        refreshFinalizedMenu: loadMealData,
        retryLoad: loadMealData,
        weekKey
    };

    return (
        <MealContext.Provider value={value}>
            {children}
        </MealContext.Provider>
    );
}
