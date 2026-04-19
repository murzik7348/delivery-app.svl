import { useState, useCallback, useEffect } from 'react';
import * as LiveActivity from 'expo-live-activity';

export function useLiveActivity() {
    const [activityId, setActivityId] = useState(null);

    // When the hook mounts, check if there are dangling activities from previous hot reloads
    useEffect(() => {
        const checkExistingActivities = async () => {
            const activities = LiveActivity.activities || [];
            if (activities.length > 0) {
                // Adopt the first one we find so we don't spawn duplicates
                setActivityId(activities[0].id);

                // Clean up any extra duplicates beyond the first one
                if (activities.length > 1) {
                    for (let i = 1; i < activities.length; i++) {
                        try {
                            LiveActivity.stopActivity(activities[i].id, {
                                title: 'Замовлення',
                                subtitle: '{}'
                            });
                        } catch (e) { }
                    }
                }
            }
        };
        checkExistingActivities();
    }, []);

    const startOrUpdateActivity = useCallback(async (title, rideDataStr) => {
        try {
            // Check native state just in case our React state is somehow out of sync
            const activities = LiveActivity.activities || [];
            let activeId = activityId;

            if (!activeId && activities.length > 0) {
                activeId = activities[0].id;
                setActivityId(activeId);
            }

            if (activeId) {
                // У нас уже є запущене Activity, оновлюємо його
                await LiveActivity.updateActivity(activeId, {
                    title: title,
                    subtitle: rideDataStr
                });
                return activeId;
            } else {
                // Створюємо нове Activity та зберігаємо його ID
                const newId = LiveActivity.startActivity({
                    title: title,
                    subtitle: rideDataStr,
                    progressBar: {
                        date: new Date(Date.now() + 24 * 60 * 1000).getTime(),
                    }
                }, {
                    backgroundColor: '#000000',
                    titleColor: '#ffffff',
                    subtitleColor: '#ffffff',
                    timerType: 'circular'
                });

                if (newId) {
                    setActivityId(newId);
                }
                return newId;
            }
        } catch (error) {
            console.error("Live Activity Error:", error);

            // Fallback emergency cleanup if we hit maximum limit
            if (error?.message?.includes("Maximum number of activities")) {
                const activities = LiveActivity.activities || [];
                for (let act of activities) {
                    try {
                        LiveActivity.stopActivity(act.id, { title: 'Ended', subtitle: '{}' });
                    } catch (cleanErr) { }
                }
                setActivityId(null);
            }
            throw error;
        }
    }, [activityId]);

    const endActivity = useCallback(async (title, rideDataStr) => {
        try {
            const activities = LiveActivity.activities || [];
            const activeId = activityId || (activities.length > 0 ? activities[0].id : null);

            if (activeId) {
                await LiveActivity.stopActivity(activeId, {
                    title: title,
                    subtitle: rideDataStr
                });
                setActivityId(null); // Очищаємо ID після успішного завершення
            }
        } catch (error) {
            console.error("Live Activity End Error:", error);
        }
    }, [activityId]);

    return {
        activityId,
        startOrUpdateActivity,
        endActivity
    };
}
