import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reminder {
  id: string;
  user_id: string;
  ocr_result_id: string | null;
  title: string;
  description: string | null;
  reminder_type: 'warranty_expiry' | 'service_due' | 'subscription_renewal' | 'payment_due' | 'custom';
  reminder_date: string;
  notify_before_days: number;
  is_notified: boolean;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseRemindersReturn {
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  isLoading: boolean;
  error: Error | null;
  fetchReminders: () => Promise<void>;
  createReminder: (reminder: Omit<Reminder, 'id' | 'user_id' | 'is_notified' | 'is_dismissed' | 'created_at' | 'updated_at'>) => Promise<void>;
  dismissReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  createRemindersFromOCR: (ocrResultId: string, suggestedReminders: Array<{
    type: string;
    date: string;
    title: string;
    description: string;
    priority: string;
  }>) => Promise<void>;
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchReminders = useCallback(async () => {
    if (!user) {
      setReminders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('reminder_date', { ascending: true });

      if (fetchError) throw fetchError;
      setReminders(data as Reminder[] || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createReminder = useCallback(async (reminder: Omit<Reminder, 'id' | 'user_id' | 'is_notified' | 'is_dismissed' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('Please sign in to create reminders');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('reminders')
        .insert({
          ...reminder,
          user_id: user.id,
        });

      if (insertError) throw insertError;
      toast.success('Reminder created!');
      await fetchReminders();
    } catch (err) {
      console.error('Error creating reminder:', err);
      toast.error('Failed to create reminder');
    }
  }, [user, fetchReminders]);

  const dismissReminder = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ is_dismissed: true })
        .eq('id', id);

      if (updateError) throw updateError;
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder dismissed');
    } catch (err) {
      console.error('Error dismissing reminder:', err);
      toast.error('Failed to dismiss reminder');
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder deleted');
    } catch (err) {
      console.error('Error deleting reminder:', err);
      toast.error('Failed to delete reminder');
    }
  }, []);

  const createRemindersFromOCR = useCallback(async (
    ocrResultId: string,
    suggestedReminders: Array<{
      type: string;
      date: string;
      title: string;
      description: string;
      priority: string;
    }>
  ) => {
    if (!user || !suggestedReminders?.length) return;

    const validTypes = ['warranty_expiry', 'service_due', 'subscription_renewal', 'payment_due', 'custom'];
    
    const remindersToCreate = suggestedReminders
      .filter(r => r.date && r.title)
      .map(r => ({
        user_id: user.id,
        ocr_result_id: ocrResultId,
        title: r.title,
        description: r.description,
        reminder_type: validTypes.includes(r.type) ? r.type : 'custom',
        reminder_date: r.date,
        notify_before_days: r.priority === 'high' ? 14 : r.priority === 'medium' ? 7 : 3,
      }));

    if (remindersToCreate.length === 0) return;

    try {
      const { error: insertError } = await supabase
        .from('reminders')
        .insert(remindersToCreate);

      if (insertError) throw insertError;
      
      toast.success(`${remindersToCreate.length} reminder(s) created!`);
      await fetchReminders();
    } catch (err) {
      console.error('Error creating reminders from OCR:', err);
      toast.error('Failed to create reminders');
    }
  }, [user, fetchReminders]);

  // Calculate upcoming reminders (within next 30 days)
  const upcomingReminders = reminders.filter(r => {
    const reminderDate = new Date(r.reminder_date);
    const today = new Date();
    const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= -7; // Include reminders up to 7 days past due
  });

  // Fetch reminders on mount and when user changes
  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Check for notifications on load
  useEffect(() => {
    if (!user || upcomingReminders.length === 0) return;

    const today = new Date();
    const urgentReminders = upcomingReminders.filter(r => {
      const reminderDate = new Date(r.reminder_date);
      const notifyDate = new Date(reminderDate);
      notifyDate.setDate(notifyDate.getDate() - r.notify_before_days);
      return today >= notifyDate && !r.is_notified;
    });

    if (urgentReminders.length > 0) {
      toast.warning(
        `You have ${urgentReminders.length} upcoming reminder(s)!`,
        { duration: 5000 }
      );
    }
  }, [user, upcomingReminders]);

  return {
    reminders,
    upcomingReminders,
    isLoading,
    error,
    fetchReminders,
    createReminder,
    dismissReminder,
    deleteReminder,
    createRemindersFromOCR,
  };
}
