/**
 * Hebrew calendar widget showing Hebrew dates, holidays, and Zmanim times
 * Provides rich cultural and religious information
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Card, 
  Text, 
  List, 
  Chip, 
  Divider,
  Surface,
  IconButton,
  ActivityIndicator 
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { 
  hebrewCalendarService, 
  HebrewDate, 
  HebrewHoliday, 
  ZmanimTimes 
} from '../../services/hebrewCalendarService';

interface HebrewCalendarWidgetProps {
  showUpcoming?: boolean;
  showZmanim?: boolean;
  showParsha?: boolean;
  compact?: boolean;
  language?: 'en' | 'he';
}

interface TodayInfo {
  hebrewDate: HebrewDate;
  holidays: HebrewHoliday[];
  zmanim?: ZmanimTimes;
}

interface ShabbatInfo {
  candlelighting: Date | null;
  havdalah: Date | null;
  parsha?: string;
  parshaHeb?: string;
}

export default function HebrewCalendarWidget({
  showUpcoming = true,
  showZmanim = true,
  showParsha = true,
  compact = false,
  language = 'en',
}: HebrewCalendarWidgetProps) {
  const { t, i18n } = useTranslation();
  
  const [todayInfo, setTodayInfo] = useState<TodayInfo | null>(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState<HebrewHoliday[]>([]);
  const [shabbatInfo, setShabbatInfo] = useState<ShabbatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  const isRTL = i18n.dir() === 'rtl';

  useEffect(() => {
    loadCalendarData();
  }, [language]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      
      // Get today's information
      const today = hebrewCalendarService.getToday({
        language,
        candlelighting: true,
        havdalah: true,
        modernHolidays: true,
        roshChodesh: true,
      });
      
      setTodayInfo(today);

      // Get upcoming holidays
      if (showUpcoming) {
        const upcoming = hebrewCalendarService.getUpcomingHolidays({
          language,
          modernHolidays: true,
        });
        setUpcomingHolidays(upcoming.slice(0, 5)); // Limit to 5 upcoming
      }

      // Get Shabbat information
      if (showParsha) {
        const shabbat = hebrewCalendarService.getShabbatTimes();
        setShabbatInfo(shabbat);
      }

      console.log('📅 Hebrew calendar data loaded');
    } catch (error) {
      console.error('Failed to load Hebrew calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language === 'en',
    });
  };

  const getHolidayCategoryColor = (category: HebrewHoliday['category']): string => {
    switch (category) {
      case 'major': return '#f44336'; // Red
      case 'modern': return '#2196f3'; // Blue
      case 'rosh_chodesh': return '#9c27b0'; // Purple
      case 'fast': return '#795548'; // Brown
      case 'special_shabbat': return '#607d8b'; // Blue Grey
      default: return '#757575'; // Grey
    }
  };

  const getHolidayCategoryText = (category: HebrewHoliday['category']): string => {
    switch (category) {
      case 'major': return t('calendar.majorHoliday');
      case 'modern': return t('calendar.modernHoliday');
      case 'rosh_chodesh': return t('calendar.roshChodesh');
      case 'fast': return t('calendar.fastDay');
      case 'special_shabbat': return t('calendar.specialShabbat');
      default: return t('calendar.holiday');
    }
  };

  const renderTodaySection = () => {
    if (!todayInfo) return null;

    const { hebrewDate, holidays } = todayInfo;

    return (
      <Card style={styles.todayCard}>
        <Card.Content>
          <View style={[styles.todayHeader, isRTL && styles.rtlRow]}>
            <View style={styles.dateInfo}>
              <Text style={styles.hebrewDate}>
                {language === 'he' ? hebrewDate.hebrewDateHeb : hebrewDate.hebrewDate}
              </Text>
              <Text style={styles.gregorianDate}>
                {hebrewDate.gregorianDate}
              </Text>
              <Text style={styles.dayOfWeek}>
                {language === 'he' ? hebrewDate.dayOfWeekHeb : hebrewDate.dayOfWeek}
              </Text>
            </View>
            
            {hebrewDate.isLeapYear && (
              <Chip 
                mode="flat" 
                style={styles.leapYearChip}
                textStyle={styles.chipText}
              >
                {t('calendar.leapYear')}
              </Chip>
            )}
          </View>

          {holidays.length > 0 && (
            <View style={styles.holidaysSection}>
              <Text style={styles.sectionTitle}>{t('calendar.todayHolidays')}</Text>
              {holidays.map((holiday, index) => (
                <View key={holiday.id} style={styles.holidayItem}>
                  <Chip
                    mode="flat"
                    style={[
                      styles.holidayChip,
                      { backgroundColor: `${getHolidayCategoryColor(holiday.category)}15` }
                    ]}
                    textStyle={[
                      styles.holidayChipText,
                      { color: getHolidayCategoryColor(holiday.category) }
                    ]}
                  >
                    {language === 'he' ? holiday.titleHeb : holiday.title}
                  </Chip>
                  
                  {holiday.chanukahDay && (
                    <Text style={styles.holidayDetail}>
                      {t('calendar.chanukahDay', { day: holiday.chanukahDay })}
                    </Text>
                  )}
                  
                  {holiday.omerCount && (
                    <Text style={styles.holidayDetail}>
                      {t('calendar.omerCount', { count: holiday.omerCount })}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderZmanimSection = () => {
    if (!showZmanim || !todayInfo?.zmanim) return null;

    const { zmanim } = todayInfo;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('calendar.zmanim')}</Text>
          
          <View style={styles.zmanimGrid}>
            <View style={styles.zmanimItem}>
              <Text style={styles.zmanimLabel}>{t('calendar.sunrise')}</Text>
              <Text style={styles.zmanimTime}>{formatTime(zmanim.sunrise)}</Text>
            </View>
            
            <View style={styles.zmanimItem}>
              <Text style={styles.zmanimLabel}>{t('calendar.sunset')}</Text>
              <Text style={styles.zmanimTime}>{formatTime(zmanim.sunset)}</Text>
            </View>
            
            <View style={styles.zmanimItem}>
              <Text style={styles.zmanimLabel}>{t('calendar.chatzot')}</Text>
              <Text style={styles.zmanimTime}>{formatTime(zmanim.chatzot)}</Text>
            </View>
            
            <View style={styles.zmanimItem}>
              <Text style={styles.zmanimLabel}>{t('calendar.dusk')}</Text>
              <Text style={styles.zmanimTime}>{formatTime(zmanim.dusk)}</Text>
            </View>
          </View>

          {(zmanim.candlelighting || zmanim.havdalah) && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.shabbatTimes}>
                {zmanim.candlelighting && (
                  <View style={styles.shabbatTimeItem}>
                    <Text style={styles.shabbatLabel}>{t('calendar.candlelighting')}</Text>
                    <Text style={styles.shabbatTime}>{formatTime(zmanim.candlelighting)}</Text>
                  </View>
                )}
                
                {zmanim.havdalah && (
                  <View style={styles.shabbatTimeItem}>
                    <Text style={styles.shabbatLabel}>{t('calendar.havdalah')}</Text>
                    <Text style={styles.shabbatTime}>{formatTime(zmanim.havdalah)}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderParshaSection = () => {
    if (!showParsha || !shabbatInfo?.parsha) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={[styles.parshaHeader, isRTL && styles.rtlRow]}>
            <Text style={styles.sectionTitle}>{t('calendar.parsha')}</Text>
          </View>
          
          <Text style={styles.parshaName}>
            {language === 'he' ? shabbatInfo.parshaHeb : shabbatInfo.parsha}
          </Text>
          
          {shabbatInfo.candlelighting && shabbatInfo.havdalah && (
            <View style={styles.shabbatTimesCompact}>
              <Text style={styles.shabbatTimeCompact}>
                {t('calendar.candlelighting')}: {formatTime(shabbatInfo.candlelighting)}
              </Text>
              <Text style={styles.shabbatTimeCompact}>
                {t('calendar.havdalah')}: {formatTime(shabbatInfo.havdalah)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderUpcomingSection = () => {
    if (!showUpcoming || upcomingHolidays.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={[styles.upcomingHeader, isRTL && styles.rtlRow]}>
            <Text style={styles.sectionTitle}>{t('calendar.upcomingHolidays')}</Text>
            <IconButton
              icon={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              onPress={() => setExpanded(!expanded)}
            />
          </View>
          
          {expanded && (
            <View>
              {upcomingHolidays.map((holiday, index) => {
                const date = new Date(holiday.date);
                const daysAway = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <List.Item
                    key={holiday.id}
                    title={language === 'he' ? holiday.titleHeb : holiday.title}
                    description={t('calendar.daysAway', { days: daysAway })}
                    left={(props) => (
                      <List.Icon 
                        {...props} 
                        icon="calendar-star"
                        color={getHolidayCategoryColor(holiday.category)}
                      />
                    )}
                    right={() => (
                      <Chip
                        mode="flat"
                        style={styles.categoryChip}
                        textStyle={styles.categoryChipText}
                      >
                        {getHolidayCategoryText(holiday.category)}
                      </Chip>
                    )}
                    style={[styles.upcomingItem, index < upcomingHolidays.length - 1 && styles.withBorder]}
                  />
                );
              })}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>{t('calendar.loading')}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderTodaySection()}
      {renderZmanimSection()}
      {renderParshaSection()}
      {renderUpcomingSection()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
  },
  todayCard: {
    marginBottom: 12,
    elevation: 2,
  },
  card: {
    marginBottom: 12,
    elevation: 1,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  dateInfo: {
    flex: 1,
  },
  hebrewDate: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gregorianDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  dayOfWeek: {
    fontSize: 14,
    color: '#888',
  },
  leapYearChip: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  holidaysSection: {
    marginTop: 16,
  },
  holidayItem: {
    marginBottom: 8,
  },
  holidayChip: {
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  holidayChipText: {
    fontWeight: '500',
  },
  holidayDetail: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  zmanimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zmanimItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  zmanimLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  zmanimTime: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  shabbatTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shabbatTimeItem: {
    alignItems: 'center',
  },
  shabbatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  shabbatTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  parshaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parshaName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#2196f3',
  },
  shabbatTimesCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shabbatTimeCompact: {
    fontSize: 12,
    color: '#666',
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upcomingItem: {
    paddingVertical: 8,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  categoryChip: {
    backgroundColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 10,
    color: '#666',
  },
});