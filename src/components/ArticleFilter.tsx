import React, { useEffect, useState, useRef, useCallback } from "react";

// 类型定义
interface FilterState {
  tags: string[];
  sort: string;
  pageSize: number;
  currentPage: number;
  date: string; // 使用格式 "startDate,endDate" 或空字符串表示所有时间
}

interface Article {
  title: string;
  url: string;
  date: string;
  summary?: string;
  tags?: string[];
}

interface FilterResult {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// WASM模块接口
interface ArticleFilterWasm {
  ArticleFilterJS: {
    init: (indexData: Uint8Array) => void;
    get_all_tags: () => string[];
    filter_articles: (paramsJson: string) => FilterResult;
  };
  default?: () => Promise<any>;
}

interface ArticleFilterProps {
  searchParams?: Record<string, string> | URLSearchParams;
}

// 自定义日期选择器组件
const DateRangePicker: React.FC<{
  startDate: string | null;
  endDate: string | null;
  onChange: (dates: [string | null, string | null]) => void;
  placeholder?: string;
  id?: string;
}> = ({
  startDate,
  endDate,
  onChange,
  placeholder = "选择日期范围",
  id = "dateRangeButton",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(
    startDate,
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(
    endDate,
  );
  const [tempStartDate, setTempStartDate] = useState<string | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<string | null>(endDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [yearInput, setYearInput] = useState<string>(() =>
    currentMonth.getFullYear().toString(),
  );
  const [monthInput, setMonthInput] = useState<string>(() =>
    (currentMonth.getMonth() + 1).toString(),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 关闭日期选择器的函数
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  // 添加点击外部区域关闭的事件监听
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside, {
        passive: true,
      });
      document.addEventListener("touchstart", handleClickOutside, {
        passive: true,
      });
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // 更新临时日期值
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  }, [startDate, endDate]);

  // 获取当月的天数
  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  // 获取当月的第一天是星期几
  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  // 处理日期点击事件
  const handleDateClick = useCallback(
    (dateStr: string) => {
      if (
        !tempStartDate ||
        (tempStartDate && tempEndDate) ||
        dateStr < tempStartDate
      ) {
        // 设置开始日期
        setTempStartDate(dateStr);
        setTempEndDate(null);
      } else {
        // 设置结束日期
        setTempEndDate(dateStr);
      }
    },
    [tempStartDate, tempEndDate],
  );

  // 渲染日历
  const renderCalendar = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // 添加空白格子填充日历前面的部分
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-8 w-8"
          role="gridcell"
          aria-hidden="true"
        ></div>,
      );
    }

    // 添加日期格子
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;
      const isStartDate = dateStr === tempStartDate;
      const isEndDate = dateStr === tempEndDate;
      const isInRange =
        tempStartDate &&
        tempEndDate &&
        dateStr >= tempStartDate &&
        dateStr <= tempEndDate;
      const isToday = dateStr === new Date().toISOString().split("T")[0];

      // 计算按钮的ARIA标签
      let ariaLabel = `${year}年${month + 1}月${day}日`;
      if (isStartDate && isEndDate) {
        ariaLabel += "，已选择为开始和结束日期";
      } else if (isStartDate) {
        ariaLabel += "，已选择为开始日期";
      } else if (isEndDate) {
        ariaLabel += "，已选择为结束日期";
      } else if (isInRange) {
        ariaLabel += "，在选定的日期范围内";
      }
      if (isToday) {
        ariaLabel += "，今天";
      }

      // 确定aria-pressed属性值
      const ariaPressed =
        isStartDate || isEndDate || isInRange ? true : undefined;

      days.push(
        <button
          key={dateStr}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm
            ${
              isStartDate || isEndDate
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : ""
            }
            ${
              isInRange && !isStartDate && !isEndDate
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                : ""
            }
            ${
              !isStartDate && !isEndDate && !isInRange
                ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                : ""
            }
            ${
              isStartDate && isEndDate
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : ""
            }
            ${
              isToday && !isStartDate && !isEndDate && !isInRange
                ? "border border-primary-500 dark:border-primary-400"
                : ""
            }
          `}
          aria-label={ariaLabel}
          aria-pressed={ariaPressed}
          role="gridcell"
        >
          {day}
        </button>,
      );
    }

    return days;
  }, [
    currentMonth,
    tempStartDate,
    tempEndDate,
    getDaysInMonth,
    getFirstDayOfMonth,
    handleDateClick,
  ]);

  // 清除日期选择
  const clearDates = useCallback(() => {
    setTempStartDate(null);
    setTempEndDate(null);
  }, []);

  // 应用选择的日期
  const applyDates = useCallback(() => {
    setSelectedStartDate(tempStartDate);
    setSelectedEndDate(tempEndDate);
    onChange([tempStartDate, tempEndDate]);
    setIsOpen(false);
  }, [tempStartDate, tempEndDate, onChange]);

  // 获取显示的月份名称
  const getMonthName = useCallback((month: number) => {
    const monthNames = [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];
    return monthNames[month];
  }, []);

  // 设置月份
  const setMonth = useCallback((month: number) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(month);
      return newDate;
    });
  }, []);

  // 切换到上个月
  const prevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  // 切换到下个月
  const nextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // 设置年份
  const setYear = useCallback((year: number) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setFullYear(year);
      return newDate;
    });
  }, []);

  // 获取输入框显示的文本
  const getDisplayText = useCallback(() => {
    if (selectedStartDate && selectedEndDate) {
      return `${selectedStartDate} 至 ${selectedEndDate}`;
    } else if (selectedStartDate) {
      return `${selectedStartDate} 至 今天`;
    }
    return placeholder;
  }, [selectedStartDate, selectedEndDate, placeholder]);

  // 格式化日期显示
  const formatDisplayDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // 处理年份输入变化
  const handleYearInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // 只允许输入数字
      if (/^\d*$/.test(value)) {
        setYearInput(value);
      }
    },
    [],
  );

  // 处理月份输入变化
  const handleMonthInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // 只允许输入1-12的数字
      if (
        /^\d*$/.test(value) &&
        (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 12))
      ) {
        setMonthInput(value);
      }
    },
    [],
  );

  // 应用年份输入
  const applyYearInput = useCallback(() => {
    const year = parseInt(yearInput);
    // 验证年份在合理范围内（比如1900-2100）
    if (!isNaN(year) && year >= 1900 && year <= 2100) {
      setYear(year);
    } else {
      // 如果输入无效，重置为当前值
      setYearInput(currentMonth.getFullYear().toString());
    }
  }, [yearInput, currentMonth, setYear]);

  // 应用月份输入
  const applyMonthInput = useCallback(() => {
    const month = parseInt(monthInput);
    // 验证月份在1-12范围内
    if (!isNaN(month) && month >= 1 && month <= 12) {
      // 月份从0开始，所以需要减1
      setMonth(month - 1);
    } else {
      // 如果输入无效，重置为当前值
      setMonthInput((currentMonth.getMonth() + 1).toString());
    }
  }, [monthInput, currentMonth, setMonth]);

  // 处理按键事件，按回车键应用输入
  const handleYearKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyYearInput();
      }
    },
    [applyYearInput],
  );

  // 处理按键事件，按回车键应用输入
  const handleMonthKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyMonthInput();
      }
    },
    [applyMonthInput],
  );

  // 更新年份输入框的值
  useEffect(() => {
    setYearInput(currentMonth.getFullYear().toString());
  }, [currentMonth]);

  // 更新月份输入框的值
  useEffect(() => {
    setMonthInput((currentMonth.getMonth() + 1).toString());
  }, [currentMonth]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:outline-none text-left hover:bg-gray-50 dark:hover:bg-gray-600/50"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        id={id}
      >
        <div className="flex justify-between items-center">
          <span
            className={`truncate ${
              !selectedStartDate && !selectedEndDate
                ? "text-gray-400 dark:text-gray-500"
                : ""
            }`}
          >
            {getDisplayText()}
          </span>
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-40 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:w-[320px] w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-calendar-heading`}
        >
          <div className="mb-2">
            <div className="flex justify-between items-center mb-3 relative">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                aria-label="上个月"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-center space-x-2 flex-grow justify-center">
                <h3
                  id={`${id}-calendar-heading`}
                  className="sr-only"
                >
                  日期选择器 - {currentMonth.getFullYear()}年
                  {currentMonth.getMonth() + 1}月
                </h3>
                {/* 年份输入框 */}
                <div className="flex items-center">
                  <label
                    htmlFor={`${id}-yearInput`}
                    className="text-xs text-gray-600 dark:text-gray-400 mr-1"
                  >
                    年份:
                  </label>
                  <input
                    id={`${id}-yearInput`}
                    type="text"
                    value={yearInput}
                    onChange={handleYearInputChange}
                    onBlur={applyYearInput}
                    onKeyDown={handleYearKeyDown}
                    className="w-14 py-0.5 px-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-center leading-tight"
                    maxLength={4}
                    aria-label="年份输入框"
                  />
                </div>

                {/* 月份输入框 */}
                <div className="flex items-center">
                  <label
                    htmlFor={`${id}-monthInput`}
                    className="text-xs text-gray-600 dark:text-gray-400 mr-1"
                  >
                    月份:
                  </label>
                  <input
                    id={`${id}-monthInput`}
                    type="text"
                    value={monthInput}
                    onChange={handleMonthInputChange}
                    onBlur={applyMonthInput}
                    onKeyDown={handleMonthKeyDown}
                    className="w-8 py-0.5 px-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-center leading-tight"
                    maxLength={2}
                    aria-label="月份输入框"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                aria-label="下个月"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div
                  key={day}
                  className="h-8 w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs"
                  aria-hidden="true"
                >
                  {day}
                </div>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label="日历"
            >
              {renderCalendar()}
            </div>
          </div>

          {/* 添加常见时间范围快捷选项 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 pb-2 mb-1">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              常用时间范围:
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-labelledby={`${id}-shortcut-heading`}
            >
              <div
                id={`${id}-shortcut-heading`}
                className="sr-only"
              >
                日期范围快捷选项
              </div>
              <button
                type="button"
                id={`${id}-last-month`}
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today);
                  lastMonth.setMonth(today.getMonth() - 1);
                  const todayStr = today.toISOString().split("T")[0];
                  const lastMonthStr = lastMonth.toISOString().split("T")[0];
                  setTempStartDate(lastMonthStr);
                  setTempEndDate(todayStr);
                }}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="选择最近一个月的日期范围"
              >
                最近一月
              </button>
              <button
                type="button"
                id={`${id}-last-year`}
                onClick={() => {
                  const today = new Date();
                  const lastYear = new Date(today);
                  lastYear.setFullYear(today.getFullYear() - 1);
                  const todayStr = today.toISOString().split("T")[0];
                  const lastYearStr = lastYear.toISOString().split("T")[0];
                  setTempStartDate(lastYearStr);
                  setTempEndDate(todayStr);
                }}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="选择最近一年的日期范围"
              >
                最近一年
              </button>
              <button
                type="button"
                id={`${id}-this-year`}
                onClick={() => {
                  const today = new Date();
                  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                  const todayStr = today.toISOString().split("T")[0];
                  const firstDayStr = firstDayOfYear
                    .toISOString()
                    .split("T")[0];
                  setTempStartDate(firstDayStr);
                  setTempEndDate(todayStr);
                }}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="选择今年内的日期范围"
              >
                今年内
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between">
            <button
              type="button"
              id={`${id}-clear-btn`}
              onClick={clearDates}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              aria-label="清除所有已选日期"
            >
              清除
            </button>

            <button
              type="button"
              id={`${id}-apply-btn`}
              onClick={applyDates}
              className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
              aria-label="应用已选日期范围"
            >
              应用
            </button>
          </div>

          {tempStartDate && (
            <div
              className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400"
              id={`${id}-selected-info`}
              aria-live="polite"
            >
              已选择: {formatDisplayDate(tempStartDate) || tempStartDate}
              {tempEndDate
                ? ` 至 ${formatDisplayDate(tempEndDate) || tempEndDate}`
                : ""}
            </div>
          )}
        </div>
      )}

      {/* 显示已选日期范围或添加清除按钮 */}
      {(selectedStartDate || selectedEndDate) && (
        <div
          className="mt-2 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400"
          aria-live="polite"
          aria-atomic="true"
          id={`${id}-display-selection`}
        >
          <span className="truncate">
            {formatDisplayDate(selectedStartDate) || "无开始日期"} 至{" "}
            {formatDisplayDate(selectedEndDate) || "今天"}
          </span>
          <button
            type="button"
            id={`${id}-clear-selection`}
            onClick={() => {
              onChange([null, null]);
              setSelectedStartDate(null);
              setSelectedEndDate(null);
            }}
            className="ml-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
            aria-label="清除已选日期范围"
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
};

const ArticleFilter: React.FC<ArticleFilterProps> = ({ searchParams = {} }) => {
  // 添加客户端标记变量，确保只在客户端渲染某些组件
  const [isClient, setIsClient] = useState(false);

  // 添加 AbortController 引用和组件挂载状态引用
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // 组件挂载时设置客户端标记
  useEffect(() => {
    setIsClient(true);

    // 组件卸载时的清理
    return () => {
      isMountedRef.current = false;

      // 取消进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 处理searchParams，确保我们有正确的参数格式
  const getParamValue = useCallback(
    (key: string, defaultValue: string = ""): string => {
      // 服务端渲染时，我们不能访问window对象，所以需要特殊处理

      // 检查searchParams是否为空对象
      const isEmptySearchParams =
        searchParams instanceof URLSearchParams
          ? !searchParams.toString()
          : Object.keys(searchParams).length === 0;

      // 如果在客户端且searchParams为空，直接从URL获取参数
      if (isClient && isEmptySearchParams) {
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get(key);
        return value !== null ? value : defaultValue;
      }

      // 否则，从传入的searchParams获取
      if (searchParams instanceof URLSearchParams) {
        return searchParams.get(key) || defaultValue;
      }
      return (searchParams as Record<string, string>)[key] || defaultValue;
    },
    [searchParams, isClient],
  );

  const getParamArrayValue = useCallback(
    (key: string): string[] => {
      const value = getParamValue(key);
      return value ? value.split(",").filter(Boolean) : [];
    },
    [getParamValue],
  );

  // 状态管理 - 使用延迟初始化确保服务端和客户端状态一致
  const [activeFilters, setActiveFilters] = useState<FilterState>(() => ({
    tags: [],
    sort: "newest",
    pageSize: 12,
    currentPage: 1,
    date: "all",
  }));

  // 添加一个专门处理return_filter的函数
  const processReturnFilter = useCallback(() => {
    if (!isClient) return null;

    // 获取URL中的return_filter参数
    const urlParams = new URLSearchParams(window.location.search);
    const returnFilter = urlParams.get("return_filter");

    if (!returnFilter) return null;

    try {
      // 解析 Base64 编码的 JSON 参数
      const jsonStr = decodeURIComponent(atob(returnFilter));
      const paramsObj = JSON.parse(jsonStr);

      // 从解析后的对象中提取筛选条件
      const tagsParam = paramsObj["tags"] ? paramsObj["tags"].split(",") : [];
      const sortParam = paramsObj["sort"] || "newest";
      const pageSizeParam = parseInt(paramsObj["limit"] || "12");
      const currentPageParam = parseInt(paramsObj["page"] || "1");

      // 处理日期参数
      let startDateParam = "";
      let endDateParam = "";

      if (paramsObj["date"] && paramsObj["date"] !== "all") {
        const [start, end] = paramsObj["date"].split(",");
        startDateParam = start || "";
        endDateParam = end || "";
      }

      // 构造日期字符串
      const finalDateParam =
        startDateParam || endDateParam
          ? `${startDateParam},${endDateParam}`
          : "all";

      // 修改当前URL，移除return_filter参数但保留筛选参数
      const newParams = new URLSearchParams();
      if (tagsParam.length > 0) newParams.set("tags", tagsParam.join(","));
      if (sortParam !== "newest") newParams.set("sort", sortParam);
      if (pageSizeParam !== 12)
        newParams.set("limit", pageSizeParam.toString());
      if (currentPageParam !== 1)
        newParams.set("page", currentPageParam.toString());

      // 使用单独的 startDate 和 endDate 参数
      if (startDateParam) newParams.set("startDate", startDateParam);
      if (endDateParam) newParams.set("endDate", endDateParam);

      // 更新URL
      const newUrl = `${window.location.pathname}${
        newParams.toString() ? `?${newParams.toString()}` : ""
      }`;
      window.history.replaceState({}, "", newUrl);

      // 返回提取的参数
      return {
        tags: tagsParam,
        sort: sortParam,
        pageSize: pageSizeParam,
        currentPage: currentPageParam,
        date: finalDateParam,
      };
    } catch (error) {
      console.error("解析return_filter参数出错:", error);
      return null;
    }
  }, [isClient]);

  // 在客户端加载后应用URL参数
  useEffect(() => {
    if (isClient) {
      try {
        // 首先尝试处理return_filter参数
        const returnFilterParams = processReturnFilter();

        if (returnFilterParams) {
          // 如果成功提取了return_filter参数，直接应用
          setActiveFilters(returnFilterParams);
        } else {
          // 否则，使用普通URL参数
          const tagsParam = getParamArrayValue("tags");
          const sortParam = getParamValue("sort", "newest");
          const pageSizeParam = parseInt(getParamValue("limit", "12"));
          const currentPageParam = parseInt(getParamValue("page", "1"));

          // 获取日期参数
          const startDateParam = getParamValue("startDate", "");
          const endDateParam = getParamValue("endDate", "");

          // 构造日期字符串
          const dateParam =
            startDateParam || endDateParam
              ? `${startDateParam},${endDateParam}`
              : "all";

          // 一次性设置所有筛选参数
          setActiveFilters({
            tags: tagsParam,
            sort: sortParam,
            pageSize: isNaN(pageSizeParam) ? 12 : pageSizeParam,
            currentPage: isNaN(currentPageParam) ? 1 : currentPageParam,
            date: dateParam,
          });
        }
      } catch (error) {
        console.error("解析URL参数出错:", error);
      }
    }
  }, [isClient, getParamValue, getParamArrayValue, processReturnFilter]);

  const [allAvailableTags, setAllAvailableTags] = useState<string[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false); // 添加排序下拉框状态
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [wasmModule, setWasmModule] = useState<ArticleFilterWasm | null>(null);
  const [isArticlesLoaded, setIsArticlesLoaded] = useState(false);

  // refs
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null); // 添加排序下拉框引用
  const sortSelectorButtonRef = useRef<HTMLButtonElement>(null); // 添加排序按钮引用

  // 将过滤器应用到文章列表，并更新URL
  const applyFilters = (newFilters: Partial<FilterState> = {}) => {
    // 合并当前过滤器和新过滤器
    const updatedFilters = { ...activeFilters, ...newFilters };

    // 如果修改了过滤条件（而不是仅仅翻页），重置到第一页
    if (
      newFilters.tags !== undefined ||
      newFilters.sort !== undefined ||
      newFilters.date !== undefined ||
      newFilters.pageSize !== undefined
    ) {
      updatedFilters.currentPage = 1;
    }

    // 应用过滤器
    setActiveFilters(updatedFilters);

    // 构建URL参数 - 只在客户端执行
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();

      // 添加所有需要的参数
      if (updatedFilters.tags && updatedFilters.tags.length > 0)
        params.set("tags", updatedFilters.tags.join(","));
      if (updatedFilters.sort && updatedFilters.sort !== "newest")
        params.set("sort", updatedFilters.sort);

      // 日期参数处理 - 始终使用 startDate 和 endDate 参数
      if (updatedFilters.date && updatedFilters.date !== "all") {
        const [startDate, endDate] = updatedFilters.date.split(",");
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }

      if (updatedFilters.pageSize && updatedFilters.pageSize !== 12)
        params.set("limit", updatedFilters.pageSize.toString());
      if (updatedFilters.currentPage > 1)
        params.set("page", updatedFilters.currentPage.toString());

      // 构建新的URL
      const newUrl = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      // 更新浏览器URL而不刷新页面
      window.history.pushState({ path: newUrl }, "", newUrl);

      // 如果WASM模块已加载，立即执行筛选逻辑
      if (wasmModule && isArticlesLoaded) {
        applyFilteringLogic(updatedFilters);
      }
    }
  };

  // 添加文章筛选逻辑函数
  const applyFilteringLogic = async (filters: FilterState) => {
    if (!wasmModule || !wasmModule.ArticleFilterJS) {
      console.error("WASM模块未初始化");
      return;
    }

    setIsLoading(true);

    try {
      // 构建筛选参数
      const filterParams: Record<string, any> = {
        tags: filters.tags,
        sort: filters.sort,
        date: filters.date,
        page: filters.currentPage,
        limit: filters.pageSize,
      };

      // 调用WASM筛选方法
      const filterParamsJson = JSON.stringify(filterParams);
      const result = await wasmModule.ArticleFilterJS.filter_articles(
        filterParamsJson,
      );

      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;

      // 处理结果
      if (!result || typeof result !== "object") {
        console.error("WASM返回结果格式错误");
        throw new Error("筛选结果格式错误");
      }

      // 确保有一个文章数组
      let articles: Article[] = [];

      if (result.articles) {
        if (Array.isArray(result.articles)) {
          articles = result.articles;
        } else {
          console.error("返回的articles不是数组");
          // 尝试修复格式问题
          try {
            if (typeof result.articles === "string") {
              // 如果是JSON字符串，尝试解析
              const parsed = JSON.parse(result.articles);
              if (Array.isArray(parsed)) {
                articles = parsed;
              }
            }
          } catch (e) {
            console.error("尝试修复articles格式失败");
          }
        }
      }

      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;

      // 检查并修复总数
      const total =
        typeof result.total === "number" ? result.total : articles.length;
      const totalPages =
        typeof result.total_pages === "number"
          ? result.total_pages
          : Math.ceil(total / filters.pageSize);

      // 更新状态时提供明确的默认值
      setFilteredArticles(articles);
      setTotalArticles(total);
      setTotalPages(totalPages || 1);
    } catch (error) {
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;

      console.error("应用筛选逻辑出错:", error);
      setError("筛选文章时出错，请刷新页面重试");
    } finally {
      // 检查组件是否仍然挂载
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 加载WASM模块
  useEffect(() => {
    const loadWasmModule = async () => {
      try {
        const wasm = await import(
          "@/assets/wasm/article-filter/article_filter.js"
        );

        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        if (typeof wasm.default === "function") {
          await wasm.default();
        }

        // 再次检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        setWasmModule(wasm as unknown as ArticleFilterWasm);
      } catch (err) {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        console.error("加载WASM模块失败:", err);
        setError("加载筛选模块失败，请刷新页面重试");
      }
    };

    loadWasmModule();
  }, []);

  // 加载索引数据
  useEffect(() => {
    if (!wasmModule) return;

    const loadIndexData = async () => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        const response = await fetch("/index/filter_index.bin", {
          signal: abortControllerRef.current.signal,
        });

        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        if (!response.ok) {
          throw new Error(`获取筛选索引失败: ${response.statusText}`);
        }

        const indexData = await response.arrayBuffer();

        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        // 初始化WASM模块
        try {
          await wasmModule.ArticleFilterJS.init(new Uint8Array(indexData));

          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          // 获取所有标签
          const tags = (await wasmModule.ArticleFilterJS.get_all_tags()) || [];

          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          setAllAvailableTags(tags);

          // 初始加载时不依赖applyFilters函数，而是直接执行筛选逻辑
          // 这避免了循环依赖问题
          await initialLoadArticles();

          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          setIsArticlesLoaded(true);
        } catch (parseError) {
          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          console.error("解析筛选索引数据失败:", parseError);
          setError("索引文件存在但格式不正确，需要重新构建索引");
        }
      } catch (fetchError) {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        // 如果是取消的请求，不显示错误
        if (
          fetchError instanceof Error &&
          (fetchError.name === "AbortError" ||
            fetchError.message.includes("aborted"))
        ) {
          console.log("索引加载请求被取消:", fetchError.message);
          return;
        }

        console.error("获取索引数据失败:", fetchError);
        setError("索引文件缺失或无法读取，请重新构建索引");
      } finally {
        // 检查组件是否仍然挂载
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // 初始加载文章的内部函数，避免循环依赖
    const initialLoadArticles = async (skipUrlUpdate: boolean = true) => {
      try {
        // 获取当前的筛选状态
        const currentFilters = { ...activeFilters };

        // 构建筛选参数
        const filterParams: Record<string, any> = {
          tags: currentFilters.tags,
          sort: currentFilters.sort,
          date: currentFilters.date,
          page: currentFilters.currentPage,
          limit: currentFilters.pageSize,
        };

        // 调用WASM筛选方法
        const filterParamsJson = JSON.stringify(filterParams);

        // 检查WASM方法是否存在
        if (
          !wasmModule.ArticleFilterJS ||
          typeof wasmModule.ArticleFilterJS.filter_articles !== "function"
        ) {
          console.error("WASM筛选方法不存在或不是函数");
          throw new Error("WASM筛选方法不可用");
        }

        try {
          const result = await wasmModule.ArticleFilterJS.filter_articles(
            filterParamsJson,
          );

          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          // 检查结果格式
          if (!result || typeof result !== "object") {
            console.error("WASM返回结果格式错误");
            throw new Error("筛选结果格式错误");
          }

          // 修复可能的格式问题 - 确保有一个文章数组
          let articles: Article[] = [];

          if (result.articles) {
            if (Array.isArray(result.articles)) {
              articles = result.articles;
            } else {
              console.error("返回的articles不是数组");
              // 尝试修复格式问题
              try {
                if (typeof result.articles === "string") {
                  // 如果是JSON字符串，尝试解析
                  const parsed = JSON.parse(result.articles);
                  if (Array.isArray(parsed)) {
                    articles = parsed;
                  }
                }
              } catch (e) {
                console.error("尝试修复articles格式失败");
              }
            }
          }

          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          // 检查并修复总数
          const total =
            typeof result.total === "number" ? result.total : articles.length;
          const totalPages =
            typeof result.total_pages === "number"
              ? result.total_pages
              : Math.ceil(total / activeFilters.pageSize);

          // 更新状态时提供明确的默认值
          setFilteredArticles(articles);
          setTotalArticles(total);
          setTotalPages(totalPages || 1);

          // 只有在非初始加载时才更新URL参数
          if (!skipUrlUpdate && typeof window !== "undefined") {
            // 初始化URL参数
            const params = new URLSearchParams();

            // 添加标签筛选
            if (currentFilters.tags.length > 0) {
              params.set("tags", currentFilters.tags.join(","));
            }

            // 添加排序方式
            if (currentFilters.sort !== "newest") {
              params.set("sort", currentFilters.sort);
            }

            // 添加日期筛选
            if (currentFilters.date !== "all") {
              const [startDate, endDate] = currentFilters.date.split(",");
              if (startDate) params.set("startDate", startDate);
              if (endDate) params.set("endDate", endDate);
            }

            // 添加分页信息
            if (currentFilters.currentPage !== 1) {
              params.set("page", currentFilters.currentPage.toString());
            }

            // 添加每页显示数量
            if (currentFilters.pageSize !== 12) {
              params.set("limit", currentFilters.pageSize.toString());
            }

            // 构建新的URL
            const newUrl =
              window.location.pathname +
              (params.toString() ? "?" + params.toString() : "");

            // 使用history API更新URL，不刷新页面
            window.history.pushState({}, "", newUrl);
          }

          return result;
        } catch (wasmError) {
          // 检查组件是否仍然挂载
          if (!isMountedRef.current) return;

          console.error("WASM执行失败", wasmError);
          throw new Error(`WASM执行失败: ${wasmError}`);
        }
      } catch (error) {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;

        console.error("初始加载文章出错", error);
        setError("加载文章时出错，请刷新页面重试");
        return {
          articles: [],
          total: 0,
          page: 1,
          limit: activeFilters.pageSize,
          total_pages: 0,
        };
      } finally {
        // 检查组件是否仍然挂载
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadIndexData();

    // 组件卸载时清理
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [wasmModule]);

  // 检查activeFilters变化
  useEffect(() => {
    // 只有当WASM模块和文章已经加载完成后，才根据筛选条件更新
    if (wasmModule && isArticlesLoaded) {
      applyFilteringLogic(activeFilters);
    }
  }, [wasmModule, isArticlesLoaded, activeFilters]);

  // 当文章加载状态改变为true时，确保应用当前的筛选条件
  useEffect(() => {
    if (isArticlesLoaded && wasmModule) {
      // 检查URL中是否有筛选参数
      const hasFilterParams = window.location.search.length > 0;

      if (hasFilterParams) {
        applyFilteringLogic(activeFilters);
      }
    }
  }, [isArticlesLoaded, wasmModule, activeFilters]);

  // 点击外部关闭标签下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        isTagDropdownOpen &&
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target as Node) &&
        tagSelectorButtonRef.current &&
        !tagSelectorButtonRef.current.contains(event.target as Node)
      ) {
        setIsTagDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside, {
      passive: true,
    });
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isTagDropdownOpen]);

  // 点击外部关闭排序下拉菜单
  useEffect(() => {
    function handleSortDropdownClickOutside(event: MouseEvent | TouchEvent) {
      if (
        isSortDropdownOpen &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node) &&
        sortSelectorButtonRef.current &&
        !sortSelectorButtonRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleSortDropdownClickOutside, {
      passive: true,
    });
    document.addEventListener("touchstart", handleSortDropdownClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleSortDropdownClickOutside);
      document.removeEventListener(
        "touchstart",
        handleSortDropdownClickOutside,
      );
    };
  }, [isSortDropdownOpen]);

  // 清除所有筛选条件
  const resetAllFilters = useCallback(() => {
    const defaultFilters = {
      tags: [],
      sort: "newest",
      pageSize: 12,
      currentPage: 1,
      date: "all",
    };

    // 先更新UI状态
    setActiveFilters(defaultFilters);

    // 清除URL参数
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", window.location.pathname);
    }

    // 如果WASM模块已加载，直接调用筛选逻辑以确保实际应用
    if (wasmModule && isArticlesLoaded) {
      applyFilteringLogic(defaultFilters);
    }
  }, [wasmModule, isArticlesLoaded]);

  // 渲染错误信息
  const renderError = () => (
    <div className="col-span-3 text-center py-8">
      <div className="text-red-500 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {error?.includes("索引文件") ? "索引数据错误" : "加载失败"}
      </div>
      <p className="text-gray-600 dark:text-gray-400">{error}</p>
      <div className="mt-4 flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-300 max-w-lg">
          <p className="font-medium">需要重新构建索引</p>
          <p className="mt-2">请手动执行以下步骤：</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>在命令行中进入项目根目录</li>
            <li>
              运行索引构建命令：
              <code className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                npm run build
              </code>
            </li>
            <li>等待索引构建完成</li>
            <li>刷新此页面</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            注意：索引构建可能需要一些时间，取决于您的文章数量
          </p>
        </div>
      </div>
    </div>
  );

  // 渲染筛选控件
  const renderFilterControls = () => {
    // 筛选标签
    const getFilteredTags = () => {
      const searchTerm = tagSearchInput.toLowerCase().trim();
      if (!searchTerm) {
        return allAvailableTags;
      }
      return allAvailableTags.filter((tag) =>
        tag.toLowerCase().includes(searchTerm),
      );
    };

    // 更新标签按钮文本
    const getTagSelectorText = () => {
      if (activeFilters.tags.length > 0) {
        return `已选 ${activeFilters.tags.length} 个标签`;
      }
      return "选择标签";
    };

    // 处理每页数量变更
    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = parseInt(e.target.value);

      // 先更新UI状态
      setActiveFilters((prev) => ({
        ...prev,
        pageSize: value,
        currentPage: 1, // 重置为第一页
      }));

      // 直接传递新的每页数量状态给筛选函数，并更新URL
      applyFilters({
        pageSize: value,
        currentPage: 1,
      });
    };

    // 处理标签选择变更
    const handleTagSelection = (tag: string) => {
      const isRemove = activeFilters.tags.includes(tag);
      let newTags: string[];

      if (isRemove) {
        // 如果标签已选中，则移除
        newTags = activeFilters.tags.filter((t) => t !== tag);
      } else {
        // 如果标签未选中，则添加
        newTags = [...activeFilters.tags, tag];
      }

      // 先更新UI状态
      setActiveFilters((prev) => ({
        ...prev,
        tags: newTags,
        currentPage: 1, // 重置为第一页
      }));

      // 直接传递新的标签状态给筛选函数，并更新URL
      applyFilters({
        tags: newTags,
        currentPage: 1,
      });
    };

    // 删除单个标签
    const removeTag = (tag: string) => {
      const newTags = activeFilters.tags.filter((t) => t !== tag);

      // 先更新UI状态
      setActiveFilters((prev) => ({
        ...prev,
        tags: newTags,
        currentPage: 1, // 重置为第一页
      }));

      // 直接传递新的标签状态给筛选函数，并更新URL
      applyFilters({
        tags: newTags,
        currentPage: 1,
      });
    };

    // 切换标签下拉菜单
    const toggleTagDropdown = () => {
      const newState = !isTagDropdownOpen;

      setIsTagDropdownOpen(newState);
    };

    // 清除所有标签
    const clearAllTags = () => {
      // 先更新UI状态
      setActiveFilters((prev) => ({
        ...prev,
        tags: [],
        currentPage: 1, // 重置为第一页
      }));

      // 直接传递清除标签后的状态给筛选函数，并更新URL
      applyFilters({
        tags: [],
        currentPage: 1,
      });
    };

    // 根据加载状态获取标签搜索框的占位文本
    const getTagSearchPlaceholder = () => {
      if (isLoading) {
        return "正在加载标签...";
      } else if (error) {
        return "加载标签失败";
      }
      return "搜索标签...";
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
        {/* 筛选控件 */}
        <div className="p-4 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              文章筛选
            </h2>
            <button
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none hover:translate-x-0.5 hover:scale-105 flex items-center"
              onClick={resetAllFilters}
            >
              <span>重置所有筛选</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 时间筛选 */}
            <div className="filter-group w-full">
              <label
                htmlFor="articleFilterDateRange"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                发布时间范围
              </label>
              <div className="relative w-full">
                <DateRangePicker
                  id="articleFilterDateRange"
                  startDate={
                    activeFilters.date !== "all"
                      ? activeFilters.date.split(",")[0]
                      : null
                  }
                  endDate={
                    activeFilters.date !== "all" &&
                    activeFilters.date.split(",")[1]
                      ? activeFilters.date.split(",")[1]
                      : null
                  }
                  onChange={(dates) => {
                    const [startDate, endDate] = dates;
                    // 如果开始或结束日期有一个不为空，则组合成 "startDate,endDate" 格式
                    // 如果都为空，则设为 "all"
                    const dateValue =
                      startDate || endDate
                        ? `${startDate || ""},${endDate || ""}`
                        : "all";

                    // 更新组件状态
                    setActiveFilters((prev) => ({
                      ...prev,
                      date: dateValue,
                      currentPage: 1,
                    }));

                    // 应用筛选
                    applyFilters({
                      date: dateValue,
                      currentPage: 1,
                    });
                  }}
                  placeholder="选择日期范围"
                />
              </div>
            </div>

            {/* 排序方式 */}
            <div className="filter-group w-full">
              <label
                id="sort-label"
                htmlFor="sort-button"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                排序方式
              </label>
              <div className="relative w-full">
                {/* 替换原生select为自定义下拉菜单 */}
                <div className="relative w-full">
                  <button
                    ref={sortSelectorButtonRef}
                    type="button"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    aria-expanded={isSortDropdownOpen}
                    aria-haspopup="listbox"
                    aria-labelledby="sort-label"
                    id="sort-button"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:outline-none text-left flex justify-between items-center"
                  >
                    <span className="truncate">
                      {activeFilters.sort === "newest" && "最新发布"}
                      {activeFilters.sort === "oldest" && "最早发布"}
                      {activeFilters.sort === "title_asc" && "标题 A-Z"}
                      {activeFilters.sort === "title_desc" && "标题 Z-A"}
                    </span>
                    <svg
                      className="w-4 h-4 ml-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* 下拉选项列表 */}
                  {isSortDropdownOpen && (
                    <div
                      className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
                      ref={sortDropdownRef}
                      role="listbox"
                      aria-labelledby="sort-label"
                    >
                      <div>
                        {[
                          { value: "newest", label: "最新发布" },
                          { value: "oldest", label: "最早发布" },
                          { value: "title_asc", label: "标题 A-Z" },
                          { value: "title_desc", label: "标题 Z-A" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm ${
                              activeFilters.sort === option.value
                                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => {
                              handleSortOptionSelect(option.value);
                              setIsSortDropdownOpen(false);
                            }}
                            role="option"
                            aria-selected={activeFilters.sort === option.value}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 标签筛选器 */}
            <div className="filter-group w-full">
              <label
                htmlFor="tagSelectorButton"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                文章标签
              </label>
              <div className="relative w-full">
                <button
                  ref={tagSelectorButtonRef}
                  id="tagSelectorButton"
                  className="w-full text-left flex justify-between items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:outline-none"
                  onClick={toggleTagDropdown}
                  aria-expanded={isTagDropdownOpen}
                  aria-haspopup="true"
                >
                  <span
                    className={`truncate ${
                      activeFilters.tags.length > 0
                        ? "text-primary-600 dark:text-primary-400"
                        : ""
                    }`}
                  >
                    {getTagSelectorText()}
                  </span>
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isTagDropdownOpen && (
                  <div
                    ref={tagDropdownRef}
                    className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col"
                  >
                    <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 z-10">
                      <div className="relative">
                        <label
                          htmlFor="tagSearchInput"
                          className="sr-only"
                        >
                          搜索标签
                        </label>
                        <input
                          id="tagSearchInput"
                          type="text"
                          placeholder={getTagSearchPlaceholder()}
                          value={tagSearchInput}
                          onChange={(e) => setTagSearchInput(e.target.value)}
                          className={`w-full py-2 pl-9 pr-8 text-sm border ${
                            error
                              ? "border-red-300 dark:border-red-600"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/50`}
                        />
                        <svg
                          className="w-5 h-5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        {/* 加载状态指示器 */}
                        {isLoading && (
                          <div
                            className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
                            aria-label="正在加载标签"
                          >
                            <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                          </div>
                        )}

                        {/* 错误状态指示器 */}
                        {error && (
                          <div
                            className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
                            aria-label="加载标签出错"
                          >
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2 overflow-y-auto flex-grow">
                      {getFilteredTags().length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5">
                          {getFilteredTags().map((tag) => (
                            <label
                              key={tag}
                              htmlFor={`tag-checkbox-${tag.replace(
                                /\s+/g,
                                "-",
                              )}`}
                              className={`flex items-center p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md cursor-pointer ${
                                activeFilters.tags.includes(tag)
                                  ? "bg-primary-50 dark:bg-primary-900/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                <input
                                  id={`tag-checkbox-${tag.replace(
                                    /\s+/g,
                                    "-",
                                  )}`}
                                  type="checkbox"
                                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:bg-gray-700"
                                  checked={activeFilters.tags.includes(tag)}
                                  onChange={() => handleTagSelection(tag)}
                                />
                                <span className="ml-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                                  {tag}
                                </span>
                              </div>
                              {activeFilters.tags.includes(tag) && (
                                <span
                                  className="ml-auto text-primary-500 dark:text-primary-400 flex-shrink-0"
                                  aria-hidden="true"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4.5 w-4.5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                            />
                          </svg>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            没有找到匹配的标签
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            尝试其他搜索关键词
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between p-2 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 shadow-md z-10">
                      <button
                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center"
                        onClick={clearAllTags}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        清除选择
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm"
                        onClick={() => setIsTagDropdownOpen(false)}
                      >
                        完成
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 显示已选标签 */}
        <div className="px-4 py-3 border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 min-h-8 max-h-24 overflow-y-auto">
          {activeFilters.tags.length > 0 ? (
            <>
              {activeFilters.tags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50 shadow-sm hover:bg-primary-100 dark:hover:bg-primary-800/40 group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1.5 text-primary-500 dark:text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span className="truncate max-w-[150px] font-medium">
                    {tag}
                  </span>
                  <button
                    className="ml-1.5 text-primary-400 group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300 focus:outline-none p-0.5 rounded-full hover:bg-primary-200/50 dark:hover:bg-primary-800/50 opacity-70 group-hover:opacity-100"
                    onClick={() => removeTag(tag)}
                    title="移除此标签"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={clearAllTags}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                清除全部
              </button>
            </>
          ) : (
            <div className="w-full text-center py-2 text-sm text-gray-500 dark:text-gray-400">
              尚未选择任何标签，点击上方"选择标签"按钮进行筛选
            </div>
          )}
        </div>

        {/* 筛选结果统计 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex flex-wrap justify-between items-center gap-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 w-full sm:w-auto mb-1 sm:mb-0">
            {totalArticles > 0
              ? `共找到 ${totalArticles} 篇文章，当前显示第 ${Math.min(
                  (activeFilters.currentPage - 1) * activeFilters.pageSize + 1,
                  totalArticles,
                )}-${Math.min(
                  activeFilters.currentPage * activeFilters.pageSize,
                  totalArticles,
                )} 篇`
              : "没有找到符合条件的文章"}
          </div>

          {/* 每页显示数量 */}
          <div className="flex items-center">
            <label
              htmlFor="pageSizeOption"
              className="text-sm text-gray-600 dark:text-gray-400 mr-2"
            >
              每页显示:
            </label>
            <div className="relative inline-block w-24">
              <select
                id="pageSizeOption"
                value={activeFilters.pageSize.toString()}
                onChange={handlePageSizeChange}
                aria-label="选择每页显示的文章数量"
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-1 px-2 text-sm rounded focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:outline-none appearance-none"
              >
                <option value="12">12 篇</option>
                <option value="24">24 篇</option>
                <option value="36">36 篇</option>
                <option value="48">48 篇</option>
              </select>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 在 ArticleFilter 组件中添加一个新函数，用于生成带有查询参数的链接
  const generateArticleLink = useCallback((articleUrl: string) => {
    // 只在客户端执行
    if (typeof window === "undefined") return articleUrl;

    // 获取当前URL的查询参数
    const currentParams = new URLSearchParams(window.location.search);

    // 如果没有查询参数，直接返回原始URL
    if (!currentParams.toString()) return articleUrl;

    // 创建一个参数对象
    const paramsObj: Record<string, string> = {};

    // 提取日期参数
    let startDate = currentParams.get("startDate") || "";
    let endDate = currentParams.get("endDate") || "";

    // 添加其他参数
    for (const [key, value] of currentParams.entries()) {
      // 跳过 return_filter, startDate, endDate 参数
      if (key === "return_filter" || key === "startDate" || key === "endDate")
        continue;

      // 添加其他所有参数
      paramsObj[key] = value;
    }

    // 如果有日期参数，添加 date 字段
    if (startDate || endDate) {
      paramsObj["date"] = `${startDate},${endDate}`;
    }

    // 将参数对象转换为JSON字符串
    const paramsJson = JSON.stringify(paramsObj);

    // 检查文章URL是否已经包含查询参数
    const hasQueryParams = articleUrl.includes("?");

    // 如果已包含参数，使用&连接，否则使用?开始
    const connector = hasQueryParams ? "&" : "?";

    // 附加处理后的查询参数，使用 Base64 编码
    // 修改: 先使用 encodeURIComponent 处理 JSON 字符串，再使用 btoa 进行 Base64 编码
    // 这样可以处理中文等非ASCII字符
    const base64Params = btoa(encodeURIComponent(paramsJson));

    // 返回最终链接
    return `${articleUrl}${connector}return_filter=${base64Params}`;
  }, []);

  // 渲染文章列表
  const renderArticleList = () => {
    if (filteredArticles.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="text-gray-400 dark:text-gray-500 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            没有找到符合条件的文章
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            尝试调整筛选条件或者清除所有筛选以查看更多文章
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg inline-flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重置所有筛选条件
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((article, index) => (
          <div
            key={`${article.url}-${index}`}
            className="article-card"
          >
            <a
              href={generateArticleLink(article.url)}
              className="article-card-link"
              data-astro-prefetch="viewport"
            >
              <div className="article-card-content">
                <div className="article-card-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <div className="article-card-body">
                  <h3 className="article-card-title">
                    {article.title || "无标题"}
                  </h3>

                  {article.summary && (
                    <p className="article-card-summary">{article.summary}</p>
                  )}

                  <div className="article-card-footer">
                    <time
                      dateTime={article.date}
                      className="article-card-date"
                    >
                      {article.date
                        ? new Date(article.date).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "无日期"}
                    </time>
                    <span className="article-card-read-more">阅读全文</span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    );
  };

  // 渲染分页控件
  const renderPagination = () => {
    if (totalPages <= 1 || filteredArticles.length === 0) {
      return null;
    }

    // 计算要显示的页码
    const getPageNumbers = () => {
      const currentPage = activeFilters.currentPage;
      const totalPages = Math.ceil(totalArticles / activeFilters.pageSize);

      if (totalPages <= 7) {
        // 如果总页数小于等于7，则全部显示
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      // 否则显示当前页附近的页码
      const pages = [];

      // 始终显示第一页
      pages.push(1);

      if (currentPage > 3) {
        // 如果当前页大于3，显示省略号
        pages.push("...");
      }

      // 计算要显示的中间页码
      const middleStart = Math.max(2, currentPage - 1);
      const middleEnd = Math.min(totalPages - 1, currentPage + 1);

      for (let i = middleStart; i <= middleEnd; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        // 如果当前页小于倒数第三页，显示省略号
        pages.push("...");
      }

      // 始终显示最后一页
      if (totalPages > 1) {
        pages.push(totalPages);
      }

      return pages;
    };

    // 处理页面变更
    const handlePageChange = (page: number) => {
      if (page < 1 || page > totalPages || page === activeFilters.currentPage) {
        return;
      }

      // 先更新UI状态
      setActiveFilters((prev) => ({
        ...prev,
        currentPage: page,
      }));

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: "smooth" });

      // 直接传递新的页码状态给筛选函数，并更新URL
      applyFilters({
        currentPage: page,
      });
    };

    return (
      <div className="flex justify-center mt-8">
        <div className="flex rounded-lg shadow-sm">
          {/* 上一页按钮 */}
          <button
            onClick={() => handlePageChange(activeFilters.currentPage - 1)}
            disabled={activeFilters.currentPage === 1}
            className={`px-3 py-2 border-r border-gray-200 dark:border-gray-700 rounded-l-lg flex items-center ${
              activeFilters.currentPage === 1
                ? "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* 页码按钮 */}
          {getPageNumbers().map((page, i) =>
            typeof page === "number" ? (
              <button
                key={i}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 ${
                  i === getPageNumbers().length - 1
                    ? "border-r border-gray-200 dark:border-gray-700"
                    : ""
                } ${
                  page === activeFilters.currentPage
                    ? "bg-primary-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                } ${i === 0 ? "" : "border-l-0"}`}
              >
                {page}
              </button>
            ) : (
              <span
                key={i}
                className="px-4 py-2 border-l-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                {page}
              </span>
            ),
          )}

          {/* 下一页按钮 */}
          <button
            onClick={() => handlePageChange(activeFilters.currentPage + 1)}
            disabled={activeFilters.currentPage === totalPages}
            className={`px-3 py-2 rounded-r-lg flex items-center ${
              activeFilters.currentPage === totalPages
                ? "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // 检查WASM模块初始化状态
  useEffect(() => {
    if (wasmModule && wasmModule.ArticleFilterJS) {
      // 检查WASM模块是否有必要的方法
      const methods = ["init", "get_all_tags", "filter_articles"];
      const missingMethods = methods.filter((method) => {
        // 使用类型安全的方式检查方法
        if (method === "init") {
          return typeof wasmModule.ArticleFilterJS.init !== "function";
        } else if (method === "get_all_tags") {
          return typeof wasmModule.ArticleFilterJS.get_all_tags !== "function";
        } else if (method === "filter_articles") {
          return (
            typeof wasmModule.ArticleFilterJS.filter_articles !== "function"
          );
        }
        return true;
      });

      if (missingMethods.length > 0) {
        console.error("WASM模块缺少方法:", missingMethods);
        setError(`WASM模块缺少必要方法: ${missingMethods.join(", ")}`);
      }
    }
  }, [wasmModule]);

  // 增加一个监听器来检查文章数据更新后的状态
  useEffect(() => {
    if (isArticlesLoaded) {
      // 如果没有文章但应该有文章，尝试诊断问题
      if (filteredArticles.length === 0 && totalArticles > 0) {
        console.error("状态不一致：总数显示有文章但列表为空");
      }

      // 检查数据格式是否正确
      if (filteredArticles.length > 0) {
        const firstArticle = filteredArticles[0];

        // 检查必要字段
        const requiredFields = ["title", "url", "date"];
        const missingFields = requiredFields.filter(
          (field) => !firstArticle[field as keyof Article],
        );

        if (missingFields.length > 0) {
          console.error("文章数据缺少必要字段:", missingFields);
        }
      }
    }
  }, [filteredArticles, totalArticles, isArticlesLoaded]);

  // 添加错误记录效果
  useEffect(() => {
    if (error) {
      // 记录错误到控制台而不是显示在界面上
      console.error("[ArticleFilter] 加载错误:", error);
    }
  }, [error]);

  // 处理排序选项选择
  const handleSortOptionSelect = (sortValue: string) => {
    // 更新UI状态
    setActiveFilters((prev) => ({
      ...prev,
      sort: sortValue,
      currentPage: 1, // 重置为第一页
    }));

    // 应用筛选
    applyFilters({
      sort: sortValue,
      currentPage: 1,
    });
  };

  // 修改组件返回的内容
  return (
    <div className="w-full">
      {/* 始终显示筛选控件 */}
      {renderFilterControls()}

      {/* 文章列表区域 - 修改加载显示方式 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {renderArticleList()}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default ArticleFilter;
