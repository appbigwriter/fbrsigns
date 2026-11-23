import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, Building, FileText, Paperclip, UploadCloud, X, File, AlertCircle } from 'lucide-react';

const quoteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  company: z.string().optional(),
  projectType: z.string().min(1, 'Select a project type'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  budget: z.string().min(1, 'Select a budget range'),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const projectTypes = [
  'Commercial Signs',
  'Digital Signage',
  'Vehicle Wraps',
  'Stands and Displays',
  'Industrial Signage',
  'Other',
];

const budgetRanges = [
  'Up to $1,000',
  '$1,000 - $5,000',
  '$5,000 - $10,000',
  '$10,000 - $25,000',
  'Above $25,000',
];

export const QuoteRequestForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleValidateAndSetFile = (file: File) => {
    setFileError(null);
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setFileError('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleValidateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: QuoteFormData) => {
    try {
      let arquivoUrl: string | null = null;
      let arquivoNome: string | null = null;

      if (selectedFile) {
        setIsUploading(true);
        arquivoNome = selectedFile.name;
        const fileExt = selectedFile.name.split('.').pop() || 'bin';
        const cleanName = selectedFile.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 40);
        const uniqueFileName = `${Date.now()}_${cleanName}.${fileExt}`;
        const filePath = `quotes/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('quote-attachments')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn('Could not upload file to quote-attachments bucket:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('quote-attachments')
            .getPublicUrl(filePath);
          arquivoUrl = urlData?.publicUrl || null;
        }
        setIsUploading(false);
      }

      const finalDescription = arquivoUrl
        ? `${data.description}\n\n📎 Attached File: ${arquivoNome}\n${arquivoUrl}`
        : data.description;

      const { error } = await supabase
        .from('orcamentos')
        .insert({
          nome: data.name,
          email: data.email,
          telefone: data.phone,
          empresa: data.company || null,
          servico: data.projectType,
          descricao: finalDescription,
          orcamento_estimado: null, // Will be filled by admin
          status: 'pendente',
          prioridade: 'media',
          arquivo_url: arquivoUrl,
          arquivo_nome: arquivoNome,
        });

      if (error) {
        console.error('Error submitting quote:', error);
        throw error;
      }
      
      toast({
        title: "Quote requested successfully!",
        description: selectedFile
          ? "We received your request and attachment. We will contact you within 24 hours."
          : "We will contact you within 24 hours.",
      });
      
      reset();
      handleRemoveFile();
    } catch (error) {
      console.error('Quote submission error:', error);
      setIsUploading(false);
      toast({
        title: "Error requesting quote",
        description: "Please try again in a few minutes.",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Get a Quote</h2>
        <p className="text-muted-foreground">
          Fill out the form below and receive a personalized proposal within 24 hours
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Full Name *
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Your full name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your@email.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone *
            </Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              {...register('company')}
              placeholder="Company name (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectType">Project Type *</Label>
            <select
              id="projectType"
              {...register('projectType')}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select project type</option>
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.projectType && (
              <p className="text-sm text-destructive">{errors.projectType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget Range *</Label>
            <select
              id="budget"
              {...register('budget')}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select budget range</option>
              {budgetRanges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
            {errors.budget && (
              <p className="text-sm text-destructive">{errors.budget.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Project Description *
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe your project in detail, including dimensions, desired materials, deadlines and any relevant information..."
            rows={5}
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* File Upload Field */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attach File / Reference Design (Optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Upload your logo, layout, artwork, sketch or document to help us better understand your project.
          </p>

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-border/80 hover:border-primary/60 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps,.psd,.zip,.doc,.docx"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-primary hover:underline">
                    Click to upload
                  </span>{' '}
                  or drag and drop your file here
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, PNG, JPG, SVG, AI, EPS, PSD, ZIP (Max 25MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 border rounded-lg bg-card/60 border-primary/30">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                  <File className="h-5 w-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate max-w-xs sm:max-w-md">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {fileError}
            </p>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <GlassButton
            type="submit"
            variant="hero"
            size="lg"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting || isUploading
              ? isUploading
                ? 'Uploading file...'
                : 'Sending quote...'
              : 'Get a Quote'}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
};
