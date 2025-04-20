import React, { useState, useEffect, useRef } from 'react';

interface CountdownProps {
    targetDate: string; // 目标日期，格式：'YYYY-MM-DD'
    className?: string; // 自定义类名
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({ targetDate, className = '' }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: false
    });
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            try {
                const now = new Date().getTime();
                const target = new Date(targetDate).getTime();
                
                // 检查目标日期是否有效
                if (isNaN(target)) {
                    console.error(`无效的目标日期: ${targetDate}`);
                    return {
                        days: 0,
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                        expired: true
                    };
                }
                
                const difference = target - now;
                const expired = difference <= 0;

                if (expired) {
                    return {
                        days: 0,
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                        expired: true
                    };
                }

                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                return { days, hours, minutes, seconds, expired: false };
            } catch (error) {
                console.error('计算倒计时发生错误:', error);
                return {
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    expired: true
                };
            }
        };

        // 立即计算一次时间
        setTimeLeft(calculateTimeLeft());

        // 设置定时器
        timerRef.current = window.setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            
            // 如果已经到期，清除计时器
            if (newTimeLeft.expired && timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, 1000);

        // 清理函数
        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [targetDate]);

    const TimeBox = ({ value, label }: { value: number; label: string }) => (
        <div className="text-center px-4">
            <div className="text-4xl font-light">
                {value.toString().padStart(2, '0')}
            </div>
            <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    );

    if (timeLeft.expired) {
        return (
            <div className={`text-center ${className}`}>
                <div className="text-xl text-gray-500 dark:text-gray-400">时间已到</div>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <TimeBox value={timeLeft.days} label="天" />
            <TimeBox value={timeLeft.hours} label="时" />
            <TimeBox value={timeLeft.minutes} label="分" />
            <TimeBox value={timeLeft.seconds} label="秒" />
        </div>
    );
}; 