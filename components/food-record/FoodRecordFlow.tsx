import React, { useState, useCallback } from 'react';
import { PhotoCapture } from './PhotoCapture';
import { MealTagger } from './MealTagger';
import { CardPreview } from './CardPreview';
import { StepIndicator } from '../layout/StepIndicator';
import { autoDetectMealType } from '../../constants';
import { saveRecord } from '../../services/storage';
import type { MealRecord, MealType, FoodItem } from '../../types';

interface FoodRecordFlowProps {
  onRecordSaved: () => void;
}

type Step = 'capture' | 'tag' | 'preview';

export const FoodRecordFlow: React.FC<FoodRecordFlowProps> = ({ onRecordSaved }) => {
  const [step, setStep] = useState<Step>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [record, setRecord] = useState<MealRecord | null>(null);

  const stepNumber = step === 'capture' ? 1 : step === 'tag' ? 2 : 3;

  const reset = useCallback(() => {
    setStep('capture');
    setImageFile(null);
    setImagePreviewUrl('');
    setRecord(null);
  }, []);

  const handlePhotoSelected = useCallback((file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setStep('tag');
  }, []);

  const handleTagComplete = useCallback(async (data: { mealType: MealType; items: FoodItem[]; note: string }) => {
    if (!imageFile) return;

    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      const now = new Date();
      const newRecord: MealRecord = {
        id: now.toISOString(),
        type: 'meal',
        imageDataUrl,
        items: data.items,
        note: data.note,
        aiAnalysis: '',
        timestamp: now.getTime(),
        mealType: data.mealType,
      };

      await saveRecord(newRecord);
      setRecord(newRecord);
      setStep('preview');
      onRecordSaved();
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile, onRecordSaved]);

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
          onBack={() => setStep('capture')}
        />
      )}

      {step === 'preview' && record && (
        <CardPreview record={record} onNewRecord={reset} />
      )}
    </div>
  );
};
