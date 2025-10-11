import React, { useState, useEffect } from 'react';
import { ModeToggle } from './mode-toggle'; // Corrected path
import { Button } from './ui/button'; // Assuming this is the UI library path
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog'; // Added Dialog components and DialogClose
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'; // For confirmation

import { settingsService } from '../services/settingsService'; // Uncommented and path verified

// TODO: Import necessary components (e.g., for layout, theme toggle, dialogs)
// import { ModeToggle } from './mode-toggle'; // Assuming this is the theme toggle
// import { Button } from './ui/button'; // Assuming a UI library like Shadcn/ui
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'; // For confirmation

// TODO: Import the settings service
// import { settingsService } from '../services/settingsService';

const SettingsPage: React.FC = () => {
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>('09:00'); // Default time
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  // TODO: Add state for controlling the delete confirmation dialog

  useEffect(() => {
    // Load reminder settings from local storage on mount
    const storedTime = localStorage.getItem('reminderTime');
    const storedEnabled = localStorage.getItem('reminderEnabled');
    if (storedTime) setReminderTime(storedTime);
    if (storedEnabled) setReminderEnabled(storedEnabled === 'true');
  }, []);

  const handleToggleReminder = () => {
    const newEnabledState = !reminderEnabled;
    setReminderEnabled(newEnabledState);
    localStorage.setItem('reminderEnabled', String(newEnabledState));
    if (newEnabledState) {
      // If enabling, ensure time is set and schedule
      localStorage.setItem('reminderTime', reminderTime);
      settingsService.scheduleReminder(reminderTime);
    } else {
      // If disabling, clear existing reminder
      settingsService.clearReminder(); // We need to add this to service
      localStorage.removeItem('reminderTime');
    }
    alert(`Reminders ${newEnabledState ? 'enabled' : 'disabled'}.`);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value;
    setReminderTime(newTime);
    if (reminderEnabled) { // Reschedule if already enabled
      localStorage.setItem('reminderTime', newTime);
      settingsService.scheduleReminder(newTime);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await settingsService.deleteAccount();
      alert('Account deleted successfully. All data has been cleared.');
      // TODO: Potentially redirect user to a logged-out state / home page or refresh the app
      setIsDeleteDialogOpen(false); // Close dialog on success
      // Clear local storage related to user session/data if any
      localStorage.clear(); // Clears all local storage, be careful if non-user data is stored
      window.location.reload(); // Force reload to clear app state
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please try again.');
      // Keep dialog open or provide feedback within the dialog
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Theme Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Appearance</h2>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <span>Change Theme</span>
          <ModeToggle />
        </div>
      </section>

      {/* Reminder Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Reminders</h2>
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-toggle" className="text-base">
              Enable daily log reminders
            </Label>
            <Button
              id="reminder-toggle"
              onClick={handleToggleReminder}
              variant={reminderEnabled ? "default" : "outline"}
            >
              {reminderEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
          {reminderEnabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={handleTimeChange}
                className="w-full md:w-1/2"
              />
              <p className="text-sm text-muted-foreground">
                You will be notified daily at this time to fill your logs.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Account Deletion */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Account</h2>
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Delete Account</h3>
          <p className="text-muted-foreground mt-1 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete My Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data (tasks, milestones, standups, satisfaction entries, etc.).
                  If you are sure, click "Confirm Delete".
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-start">
                <Button variant="destructive" onClick={handleDeleteAccount}>Confirm Delete</Button>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage; 