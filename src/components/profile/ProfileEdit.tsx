'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, 
  Save, 
  User, 
  Upload, 
  FileText, 
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  Camera
} from 'lucide-react';
import { User as UserType, UpdateUserData, useCurrentUser } from '@/hooks/useUser';
import { useAlerts } from '@/contexts/AlertContext';
import { cn } from '@/lib/utils';

interface ProfileEditProps {
  user: UserType;
  onSave: (userData: UpdateUserData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ 
  user, 
  onSave, 
  onCancel, 
  isLoading 
}) => {
  const { showSuccess, showError, showInfo } = useAlerts()
  const [formData, setFormData] = useState({
    username: user.username || '',
    bio: user.bio || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, removeAvatar, isUploadingAvatar, isRemovingAvatar } = useCurrentUser();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Username must not exceed 50 characters';
    }

    if (formData.bio.length > 200) {
      newErrors.bio = 'Bio must not exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setErrors(prev => ({ ...prev, avatar: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }));
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'File size must be less than 2MB' }));
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Clear any existing errors
    setErrors(prev => ({ ...prev, avatar: '' }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUploadAvatar = async () => {
    if (selectedFile && uploadAvatar) {
      try {
        showInfo('Uploading Avatar', 'Uploading your new profile picture...')
        
        await uploadAvatar(selectedFile);
        setSelectedFile(null);
        setAvatarPreview(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        showSuccess('Avatar Updated', 'Your profile picture has been updated!')
      } catch (error) {
        console.error('Avatar upload error:', error);
        setErrors(prev => ({ ...prev, avatar: 'Failed to upload avatar' }));
        showError('Avatar Upload Failed', error instanceof Error ? error.message : 'Failed to upload avatar')
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (removeAvatar) {
      try {
        showInfo('Removing Avatar', 'Removing your profile picture...')
        
        await removeAvatar();
        setSelectedFile(null);
        setAvatarPreview(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        showSuccess('Avatar Removed', 'Your profile picture has been removed!')
      } catch (error) {
        console.error('Avatar removal error:', error);
        setErrors(prev => ({ ...prev, avatar: 'Failed to remove avatar' }));
        showError('Avatar Removal Failed', error instanceof Error ? error.message : 'Failed to remove avatar')
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      showInfo('Saving Profile', 'Updating your profile information...')
      
      const updateData: UpdateUserData = {
        username: formData.username.trim(),
        bio: formData.bio.trim() || undefined,
      };

      await onSave(updateData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      showSuccess('Profile Updated', 'Your profile has been updated successfully!')
    } catch (error) {
      console.error('Save error:', error);
      showError('Profile Update Failed', error instanceof Error ? error.message : 'Failed to update profile')
    }
  };

  const hasChanges = () => {
    return (
      formData.username !== (user.username || '') ||
      formData.bio !== (user.bio || '') ||
      selectedFile !== null
    );
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user.avatarImage) return user.avatarImage;
    if (user.avatar) return user.avatar;
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${user.address}`;
  };

  return (
    <div className="glass-card rounded-xl p-6 border border-border/40 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Profile</h2>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>Profile Picture</span>
        </h3>
        
        {/* Avatar Preview */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={getAvatarUrl()}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full bg-muted object-cover"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-monad-purple rounded-full border-2 border-background flex items-center justify-center">
              <Camera className="h-3 w-3 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold">
              {formData.username || `User ${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
            </h4>
            {user.ensName ? (
              <div className="px-2 py-1 bg-monad-purple/20 rounded-full inline-block mt-1">
                <span className="text-xs font-medium text-monad-purple">
                  {user.ensName}
                </span>
              </div>
            ) : formData.username?.endsWith('.nad') && (
              <div className="px-2 py-1 bg-orange-500/20 rounded-full inline-block mt-1">
                <span className="text-xs font-medium text-orange-500">
                  Default Username
                </span>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragActive 
              ? "border-monad-purple bg-monad-purple/10" 
              : "border-border/40 hover:border-monad-purple/50",
            errors.avatar && "border-red-500"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF, or WebP (max 2MB)
          </p>
        </div>

        {errors.avatar && (
          <div className="flex items-center space-x-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.avatar}</span>
          </div>
        )}

        {/* Avatar Actions */}
        <div className="flex space-x-2">
          {selectedFile && (
            <Button
              onClick={handleUploadAvatar}
              disabled={isUploadingAvatar}
              className="bg-monad-purple hover:bg-monad-purple/90"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Avatar
            </Button>
          )}
          
          {(user.avatar || user.avatarImage) && (
            <Button
              onClick={handleRemoveAvatar}
              disabled={isRemovingAvatar}
              variant="outline"
              className="glass-card border-border/40"
            >
              {isRemovingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Avatar
            </Button>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Username</span>
          </label>
          <Input
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Enter your username"
            className={cn(
              "glass-card border-border/40",
              errors.username && "border-red-500"
            )}
            maxLength={50}
          />
          {errors.username && (
            <div className="flex items-center space-x-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.username}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {formData.username.length}/50 characters
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Bio</span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            className={cn(
              "glass-card border-border/40 w-full min-h-[100px] p-3 rounded-md resize-none",
              "bg-background/50 backdrop-blur-sm",
              "focus:outline-none focus:ring-2 focus:ring-monad-purple/50",
              errors.bio && "border-red-500"
            )}
            maxLength={200}
          />
          {errors.bio && (
            <div className="flex items-center space-x-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.bio}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {formData.bio.length}/200 characters
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          onClick={onCancel}
          variant="outline"
          className="glass-card border-border/40"
        >
          Cancel
        </Button>
        
        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-green-500 text-sm">
              <Check className="h-4 w-4" />
              <span>Saved!</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges() || isLoading}
            className="bg-monad-purple hover:bg-monad-purple/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit; 