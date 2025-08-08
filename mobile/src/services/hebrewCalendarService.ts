/**
 * Enhanced Hebrew calendar service with advanced features
 * Provides Hebrew date conversion, holidays, and cultural information
 */

import { HDate, Location, Event, HebrewCalendar, Zmanim } from '@hebcal/core';

interface HebrewDate {
  hebrewDate: string;
  hebrewDateHeb: string;
  gregorianDate: string;
  dayOfWeek: string;
  dayOfWeekHeb: string;
  month: string;
  monthHeb: string;
  year: number;
  hebrewYear: number;
  isLeapYear: boolean;
  dayOfYear: number;
  weekOfYear: number;
  roshHashanaDay?: number;
}

interface HebrewHoliday {
  id: string;
  title: string;
  titleHeb: string;
  date: string;
  category: 'major' | 'minor' | 'modern' | 'rosh_chodesh' | 'fast' | 'special_shabbat';
  description?: string;
  descriptionHeb?: string;
  startTime?: string;
  endTime?: string;
  isUserTime?: boolean;
  yomTov?: boolean;
  chag?: boolean;
  isMinor?: boolean;
  chanukahDay?: number;
  omerCount?: number;
}

interface CalendarOptions {
  location?: Location;
  candlelighting?: boolean;
  havdalah?: boolean;
  sedrot?: boolean;
  dafyomi?: boolean;
  omer?: boolean;
  modernHolidays?: boolean;
  roshChodesh?: boolean;
  minorFasts?: boolean;
  specialShabbat?: boolean;
  language?: 'en' | 'he';
}

interface ZmanimTimes {
  dawn: Date | null;
  sunrise: Date | null;
  sunriseGRA: Date | null;
  sunset: Date | null;
  dusk: Date | null;
  chatzot: Date | null;
  candlelighting: Date | null;
  havdalah: Date | null;
  location?: Location;
}

class HebrewCalendarService {
  private readonly DEFAULT_LOCATION: Location;
  private cachedEvents: Map<string, Event[]> = new Map();
  
  constructor() {
    // Default location: Jerusalem, Israel (safest approach using only Location.lookup)
    try {
      // Try Jerusalem first (most likely to work)
      let location = Location.lookup('Jerusalem');
      if (location) {
        this.DEFAULT_LOCATION = location;
        console.log('✅ Hebrew calendar using Jerusalem location');
        return;
      }

      // Try other Israeli cities
      const israeliCities = ['Tel Aviv', 'Haifa', 'Beer Sheva', 'Netanya'];
      for (const city of israeliCities) {
        location = Location.lookup(city);
        if (location) {
          this.DEFAULT_LOCATION = location;
          console.log(`✅ Hebrew calendar using ${city} location`);
          return;
        }
      }

      // If no Israeli city works, disable location-dependent features
      console.warn('⚠️ No Israeli location found, Hebrew calendar will work without location-specific features');
      this.DEFAULT_LOCATION = null as any;

    } catch (error) {
      console.error('❌ Hebrew calendar Location.lookup failed:', error);
      this.DEFAULT_LOCATION = null as any;
    }
  }

  /**
   * Convert Gregorian date to Hebrew date with full information
   */
  convertToHebrewDate(date: Date, language: 'en' | 'he' = 'en'): HebrewDate {
    try {
      const hd = new HDate(date);
      const greg = hd.greg();
    
      return {
        hebrewDate: hd.toString(language),
        hebrewDateHeb: hd.toString('he'),
        gregorianDate: greg.toLocaleDateString('en-US'),
        dayOfWeek: greg.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekHeb: hd.toString('he').split(' ')[0], // Extract day from Hebrew string
        month: hd.getMonthName('en'),
        monthHeb: hd.getMonthName('he'),
        year: greg.getFullYear(),
        hebrewYear: hd.getFullYear(),
        isLeapYear: hd.isLeapYear(),
        dayOfYear: this.getDayOfYear(greg),
        weekOfYear: this.getWeekOfYear(greg),
        roshHashanaDay: this.getRoshHashanaDayOfWeek(hd.getFullYear()),
      };
    } catch (error) {
      console.error('Failed to convert Hebrew date:', error);
      // Return fallback Hebrew date info
      const fallbackDate = date || new Date();
      return {
        hebrewDate: fallbackDate.toLocaleDateString(),
        hebrewDateHeb: fallbackDate.toLocaleDateString(),
        gregorianDate: fallbackDate.toLocaleDateString('en-US'),
        dayOfWeek: fallbackDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekHeb: 'יום',
        month: fallbackDate.toLocaleDateString('en-US', { month: 'long' }),
        monthHeb: 'חודש',
        year: fallbackDate.getFullYear(),
        hebrewYear: fallbackDate.getFullYear() + 3760, // Approximate Hebrew year
        isLeapYear: false,
        dayOfYear: this.getDayOfYear(fallbackDate),
        weekOfYear: this.getWeekOfYear(fallbackDate),
        roshHashanaDay: 0,
      };
    }
  }

  /**
   * Get Hebrew holidays for a date range
   */
  getHolidays(
    startDate: Date, 
    endDate: Date, 
    options: CalendarOptions = {}
  ): HebrewHoliday[] {
    const cacheKey = `${startDate.getTime()}-${endDate.getTime()}-${JSON.stringify(options)}`;
    
    if (this.cachedEvents.has(cacheKey)) {
      return this.convertEventsToHolidays(this.cachedEvents.get(cacheKey)!);
    }

    const calOptions = {
      start: startDate,
      end: endDate,
      ...(options.location || this.DEFAULT_LOCATION ? { location: options.location || this.DEFAULT_LOCATION } : {}),
      candlelighting: options.candlelighting ?? (this.DEFAULT_LOCATION ? true : false),
      havdalah: options.havdalah ?? (this.DEFAULT_LOCATION ? true : false),
      sedrot: options.sedrot ?? true,
      dafyomi: options.dafyomi ?? false,
      omer: options.omer ?? true,
      modernHolidays: options.modernHolidays ?? true,
      roshChodesh: options.roshChodesh ?? true,
      minorFasts: options.minorFasts ?? true,
      specialShabbat: options.specialShabbat ?? true,
      locale: options.language || 'en',
    };

    try {
      const events = HebrewCalendar.calendar(calOptions);
      this.cachedEvents.set(cacheKey, events);
      return this.convertEventsToHolidays(events);
    } catch (error) {
      console.warn('Hebrew calendar failed to get events:', error);
      // Return empty array instead of crashing
      return [];
    }
  }

  /**
   * Get today's Hebrew date and holidays
   */
  getToday(options: CalendarOptions = {}): {
    hebrewDate: HebrewDate;
    holidays: HebrewHoliday[];
    zmanim?: ZmanimTimes;
  } {
    try {
      const today = new Date();
      console.log('🔍 Hebrew service: Converting today date...', today);
      
      const hebrewDate = this.convertToHebrewDate(today, options.language);
      console.log('✅ Hebrew date converted:', hebrewDate.hebrewDate);
      
      console.log('🔍 Hebrew service: Getting holidays...');
      const holidays = this.getHolidays(today, today, options);
      console.log('✅ Holidays loaded:', holidays.length);
      
      let zmanim: ZmanimTimes | undefined;
      if (options.location || options.candlelighting || options.havdalah) {
        console.log('🔍 Hebrew service: Getting Zmanim...');
        zmanim = this.getZmanim(today, options.location);
        console.log('✅ Zmanim loaded');
      }
      
      return {
        hebrewDate,
        holidays,
        zmanim,
      };
    } catch (error) {
      console.error('❌ getToday failed:', error);
      // Return minimal fallback data
      const today = new Date();
      return {
        hebrewDate: {
          hebrewDate: today.toLocaleDateString(),
          hebrewDateHeb: today.toLocaleDateString(),
          gregorianDate: today.toLocaleDateString(),
          dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
          dayOfWeekHeb: 'יום',
          month: today.toLocaleDateString('en-US', { month: 'long' }),
          monthHeb: 'חודש', 
          year: today.getFullYear(),
          hebrewYear: today.getFullYear() + 3760,
          isLeapYear: false,
          dayOfYear: 1,
          weekOfYear: 1,
          roshHashanaDay: 0,
        },
        holidays: [],
      };
    }
  }

  /**
   * Get upcoming holidays (next 30 days)
   */
  getUpcomingHolidays(options: CalendarOptions = {}): HebrewHoliday[] {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return this.getHolidays(today, thirtyDaysFromNow, options)
      .filter(holiday => holiday.category === 'major' || holiday.category === 'modern')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get Zmanim (prayer times) for a specific date and location
   */
  getZmanim(date: Date, location?: Location): ZmanimTimes {
    const loc = location || this.DEFAULT_LOCATION;
    if (!loc) {
      // Return empty zmanim if no location available
      return {
        dawn: null,
        sunrise: null,
        sunriseGRA: null,
        sunset: null,
        dusk: null,
        chatzot: null,
        candlelighting: null,
        havdalah: null,
        location: undefined,
      };
    }
    const zmanim = new Zmanim(date, loc);
    
    return {
      dawn: zmanim.dawn(),
      sunrise: zmanim.sunrise(),
      sunriseGRA: zmanim.sunriseGRA(),
      sunset: zmanim.sunset(),
      dusk: zmanim.dusk(),
      chatzot: zmanim.chatzot(),
      candlelighting: zmanim.candlelighting(),
      havdalah: zmanim.havdalah(),
      location: loc,
    };
  }

  /**
   * Check if a date is a Jewish holiday
   */
  isHoliday(date: Date): { isHoliday: boolean; holidays: HebrewHoliday[] } {
    const holidays = this.getHolidays(date, date);
    const majorHolidays = holidays.filter(h => 
      h.category === 'major' || h.yomTov || h.chag
    );
    
    return {
      isHoliday: majorHolidays.length > 0,
      holidays: majorHolidays,
    };
  }

  /**
   * Get Shabbat times for the current week
   */
  getShabbatTimes(date: Date = new Date(), location?: Location): {
    candlelighting: Date | null;
    havdalah: Date | null;
    parsha?: string;
    parshaHeb?: string;
  } {
    const loc = location || this.DEFAULT_LOCATION;
    
    if (!loc) {
      // Without location, we can still get parsha but not times
      try {
        const events = HebrewCalendar.calendar({
          start: date,
          end: date,
          sedrot: true,
          locale: 'en',
        });
        
        const parshaEvent = events.find(e => e.getFlags() & Event.PARSHA_HASHAVUA);
        
        return {
          candlelighting: null,
          havdalah: null,
          parsha: parshaEvent?.render('en'),
          parshaHeb: parshaEvent?.render('he'),
        };
      } catch (error) {
        console.warn('Failed to get Shabbat parsha:', error);
        return {
          candlelighting: null,
          havdalah: null,
        };
      }
    }
    
    // Find Friday and Saturday of this week
    const dayOfWeek = date.getDay();
    const friday = new Date(date);
    friday.setDate(date.getDate() + (5 - dayOfWeek));
    
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    
    const fridayZmanim = new Zmanim(friday, loc);
    const saturdayZmanim = new Zmanim(saturday, loc);
    
    // Get parsha (Torah reading)
    const events = HebrewCalendar.calendar({
      start: saturday,
      end: saturday,
      sedrot: true,
      locale: 'en',
    });
    
    const parshaEvent = events.find(e => e.getFlags() & Event.PARSHA_HASHAVUA);
    
    return {
      candlelighting: fridayZmanim.candlelighting(),
      havdalah: saturdayZmanim.havdalah(),
      parsha: parshaEvent?.render('en'),
      parshaHeb: parshaEvent?.render('he'),
    };
  }

  /**
   * Get month view with Hebrew dates
   */
  getMonthView(year: number, month: number, options: CalendarOptions = {}): {
    days: Array<{
      gregorianDate: Date;
      hebrewDate: HebrewDate;
      holidays: HebrewHoliday[];
      isToday: boolean;
      isShabbat: boolean;
      isHoliday: boolean;
    }>;
    monthName: string;
    hebrewMonthName: string;
  } {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const holidays = this.getHolidays(firstDay, lastDay, options);
    const today = new Date();
    
    const days = [];
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const hebrewDate = this.convertToHebrewDate(date, options.language);
      const dayHolidays = holidays.filter(h => 
        new Date(h.date).toDateString() === date.toDateString()
      );
      
      const isToday = date.toDateString() === today.toDateString();
      const isShabbat = date.getDay() === 6;
      const isHoliday = dayHolidays.some(h => h.yomTov || h.chag);
      
      days.push({
        gregorianDate: date,
        hebrewDate,
        holidays: dayHolidays,
        isToday,
        isShabbat,
        isHoliday,
      });
    }
    
    return {
      days,
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long' }),
      hebrewMonthName: new HDate(firstDay).getMonthName('he'),
    };
  }

  /**
   * Search holidays by name or category
   */
  searchHolidays(
    query: string, 
    year?: number,
    options: CalendarOptions = {}
  ): HebrewHoliday[] {
    const searchYear = year || new Date().getFullYear();
    const startDate = new Date(searchYear, 0, 1);
    const endDate = new Date(searchYear, 11, 31);
    
    const holidays = this.getHolidays(startDate, endDate, options);
    
    const queryLower = query.toLowerCase();
    
    return holidays.filter(holiday => 
      holiday.title.toLowerCase().includes(queryLower) ||
      holiday.titleHeb.includes(query) ||
      holiday.category === queryLower ||
      holiday.description?.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get holiday details with cultural information
   */
  getHolidayDetails(holidayName: string): {
    name: string;
    nameHeb: string;
    description: string;
    descriptionHeb: string;
    traditions: string[];
    foods: string[];
    duration: string;
    observance: string;
    significance: string;
  } | null {
    const holidayInfo = this.getHolidayInfo(holidayName);
    return holidayInfo;
  }

  // Private helper methods

  private convertEventsToHolidays(events: Event[]): HebrewHoliday[] {
    return events.map(event => {
      const flags = event.getFlags();
      
      let category: HebrewHoliday['category'] = 'minor';
      
      if (flags & Event.CHAG) category = 'major';
      else if (flags & Event.MODERN_HOLIDAY) category = 'modern';
      else if (flags & Event.ROSH_CHODESH) category = 'rosh_chodesh';
      else if (flags & Event.MINOR_FAST) category = 'fast';
      else if (flags & Event.SPECIAL_SHABBAT) category = 'special_shabbat';
      
      return {
        id: `${event.getDate().greg().toISOString()}-${event.getDesc()}`,
        title: event.render('en'),
        titleHeb: event.render('he'),
        date: event.getDate().greg().toISOString().split('T')[0],
        category,
        yomTov: !!(flags & Event.YOM_TOV_ENDS),
        chag: !!(flags & Event.CHAG),
        isMinor: !!(flags & Event.MINOR_HOLIDAY),
        chanukahDay: typeof event.chanukahDay === 'function' ? event.chanukahDay() : undefined,
        omerCount: typeof event.omerCount === 'function' ? event.omerCount() : undefined,
      };
    });
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getWeekOfYear(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = this.getDayOfYear(date);
    return Math.ceil(dayOfYear / 7);
  }

  private getRoshHashanaDayOfWeek(hebrewYear: number): number {
    try {
      // Create Rosh Hashana date for the given Hebrew year
      const roshHashana = new HDate(1, 'Tishrei', hebrewYear);
      return roshHashana.greg().getDay(); // 0=Sunday, 1=Monday, etc.
    } catch (error) {
      console.warn('Could not calculate Rosh Hashana day of week:', error);
      return 0; // Default to Sunday
    }
  }

  private getHolidayInfo(name: string): any {
    // This would contain detailed information about holidays
    // For now, return null - would need comprehensive database
    const holidayDatabase: Record<string, any> = {
      'Rosh Hashana': {
        name: 'Rosh Hashana',
        nameHeb: 'ראש השנה',
        description: 'The Jewish New Year',
        descriptionHeb: 'ראש השנה היהודית',
        traditions: ['Shofar blowing', 'Tashlich ceremony', 'Special prayers'],
        foods: ['Apples and honey', 'Pomegranate', 'Fish head', 'Round challah'],
        duration: '2 days',
        observance: 'Biblical holiday',
        significance: 'Beginning of the High Holy Days, day of judgment',
      },
      // Add more holidays as needed
    };
    
    return holidayDatabase[name] || null;
  }

  /**
   * Clear cached events (call periodically to free memory)
   */
  clearCache(): void {
    this.cachedEvents.clear();
    console.log('🗑️ Hebrew calendar cache cleared');
  }
}

export const hebrewCalendarService = new HebrewCalendarService();
export type { HebrewDate, HebrewHoliday, CalendarOptions, ZmanimTimes };