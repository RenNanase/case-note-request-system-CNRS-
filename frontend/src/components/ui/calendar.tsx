'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3 bg-white', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium text-gray-900',
        nav: 'space-x-1 flex items-center',
        nav_button: 'h-7 w-7 bg-gray-100 hover:bg-gray-200 p-0 text-gray-700 hover:text-gray-900 border border-gray-300 rounded',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-gray-600 rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-gray-900 hover:bg-gray-100 rounded',
        day_selected: 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white',
        day_today: 'bg-gray-200 text-gray-900 font-semibold',
        day_outside: 'text-gray-400',
        day_disabled: 'text-gray-300',
        day_range_middle: 'aria-selected:bg-blue-100 aria-selected:text-blue-900',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';
