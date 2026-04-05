import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PhotoCapture } from './PhotoCapture';
import { MealTagger } from './MealTagger';
import { CardPreview } from './CardPreview';
import { StepIndicator } from '../layout/StepIndicator';
import { autoDetectMealType } from '../../constants';
import { saveRecord } from '../../services/storage';
import { loadMealDraft, consumeDuplicatedImage } from '../../services/draftStorage';
import type { MealRecord, MealType, FoodItem } from '../../types';

interface FoodRecordFlowProps {
  onRecordSaved: () => void;
}

type Step = 'capture' | 'tag' | 'preview';

export const FoodRecordFlow: React.FC<FoodRecordFlowProps> = ({ onRecordSaved }) => {
  const initDone = useRef(false);
  const [step, setStep] = useState<Step>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  /** When duplicating from history, we store the dataUrl directly (no File) */
  const [duplicatedImageUrl, setDuplicatedImageUrl] = useState<string>('');
  const [record, setRecord] = useState<MealRecord | null>(null);

  // On mount: check if there's a duplicated draft with image
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const draft = loadMealDraft();
    if (draft?.duplicated) {
      const img = consumeDuplicatedImage();
      if (img) {
        setDuplicatedImageUrl(img);
        setImagePreviewUrl(img);
        setStep('tag');
      }
    }
  }, []);

  const stepNumber = step === 'capture' ? 1 : step === 'tag' ? 2 : 3;

  const reset = useCallback(() => {
    setStep('capture');
    setImageFile(null);
    setImagePreviewUrl('');
    setDuplicatedImageUrl('');
    setRecord(null);
  }, []);

  const handlePhotoSelected = useCallback((file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setDuplicatedImageUrl(''); // clear duplicated if user picks new photo
    setStep('tag');
  }, []);

  /** Replace duplicated image with a new photo */
  const handleReplacePhoto = useCallback((file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setDuplicatedImageUrl('');
  }, []);

  const handleTagComplete = useCallback(async (data: { mealType: MealType; items: FoodItem[]; note: string; recordDate: string }) => {
    // If we have a duplicated image (no File), use the dataUrl directly
    const resolveImageUrl = (): Promise<string> => {
      if (duplicatedImageUrl) return Promise.resolve(duplicatedImageUrl);
      if (!imageFile) return Promise.reject(new Error('No image'));
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    };

    try {
      const imageDataUrl = await resolveImageUrl();
      const now = new Date();
      // If recording a past date, adjust timestamp to that date's noon
      const recordingDate = data.recordDate;
      let ts = now.getTime();
      if (recordingDate) {
        const rd = new Date(recordingDate + 'T12:00:00');
        if (rd.getTime() < now.getTime()) ts = rd.getTime();
      }

      const newRecord: MealRecord = {
        id: now.toISOString(),
        type: 'meal',
        imageDataUrl,
        items: data.items,
        note: data.note,
        aiAnalysis: '',
        timestamp: ts,
        mealType: data.mealType,
        recordDate: recordingDate,
      };

      await saveRecord(newRecord);
      setRecord(newRecord);
      setStep('preview');
      onRecordSaved();
    } catch { /* no image available */ }
  }, [imageFile, duplicatedImageUrl, onRecordSaved]);

  return (
    <div className="max-w-lg mx-auto px-4">
      <StepIndicator currentStep={stepNumber} totalSteps={3} />

      {step === 'capture' && (
        <PhotoCapture onPhotoSelected={handlePhotoSelected} />
      )}

      {step === 'tag' && (
        <MealTagger
          imagePreviewUrl={imagePreviewUrl}
          initialMealType={autoDetectMealType()}
          onComplete={handleTagComplete}
          onBack={() => { setDuplicatedImageUrl(''); setStep('capture'); }}
          isDuplicated={!!duplicatedImageUrl}
          onReplacePhoto={handleReplacePhoto}
        />
      )}

      {step === 'preview' && record && (
        <CardPreview record={record} onNewRecord={reset} />
      )}
    </div>
  );
};
