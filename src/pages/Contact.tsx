import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send,
  MessageSquare,
  User,
  Building,
  Paperclip,
  UploadCloud,
  X,
  File,
  AlertCircle
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const contactInfo = [
  {
    icon: MapPin,
    title: "Visit Our Office",
    details: ["123 Business Avenue", "Suite 100", "Your City, ST 12345"],
    action: "Get Directions"
  },
  {
    icon: Phone,
    title: "Call Us Today",
    details: ["Main: (555) 123-4567", "Emergency: (555) 987-6543", "Toll Free: (800) 555-0123"],
    action: "Call Now"
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["info@fbrsigns.com", "support@fbrsigns.com", "sales@fbrsigns.com"],
    action: "Send Email"
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Monday - Friday: 8:00 AM - 6:00 PM", "Saturday: 9:00 AM - 4:00 PM", "Sunday: Closed"],
    action: "Schedule Call"
  }
];

const serviceTypes = [
  "Custom Business Signs",
  "Digital LED Displays", 
  "Vehicle Wraps",
  "Banners & Flags",
  "Trade Show Displays",
  "Interior Signage",
  "Outdoor Advertising",
  "Installation Services",
  "Design Services",
  "Maintenance & Repair",
  "Other"
];

export default function Contact() {
  const { t } = useTranslation();
  const { data: companyInfo, isLoading } = useCompanyInfo();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    serviceType: "",
    projectDetails: "",
    budget: "",
    timeline: ""
  });

  const contactInfo = [
    {
      icon: MapPin,
      title: t('content:contact.info.office.title'),
      details: companyInfo?.company_address 
        ? companyInfo.company_address.split(',').map(part => part.trim())
        : ["123 Business Avenue", "Suite 100", "Your City, ST 12345"],
      action: t('content:contact.info.office.action')
    },
    {
      icon: Phone,
      title: t('content:contact.info.phone.title'),
      details: companyInfo?.company_phone 
        ? [companyInfo.company_phone]
        : ["Main: (555) 123-4567"],
      action: t('content:contact.info.phone.action')
    },
    {
      icon: Mail,
      title: t('content:contact.info.email.title'),
      details: companyInfo?.company_email 
        ? [companyInfo.company_email]
        : ["info@fbrsigns.com"],
      action: t('content:contact.info.email.action')
    },
    {
      icon: Clock,
      title: t('content:contact.info.hours.title'),
      details: ["Monday - Friday: 8:00 AM - 6:00 PM", "Saturday: 9:00 AM - 4:00 PM", "Sunday: Closed"],
      action: t('content:contact.info.hours.action')
    }
  ];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let arquivoUrl: string | null = null;
      let arquivoNome: string | null = null;

      if (selectedFile) {
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
      }

      let fullDescription = formData.projectDetails;
      if (formData.budget) fullDescription += `\nBudget: ${formData.budget}`;
      if (formData.timeline) fullDescription += `\nTimeline: ${formData.timeline}`;
      if (arquivoUrl) fullDescription += `\n\n📎 Attached File: ${arquivoNome}\n${arquivoUrl}`;

      const { error } = await supabase.from('orcamentos').insert({
        nome: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        telefone: formData.phone || null,
        empresa: formData.company || null,
        servico: formData.serviceType || 'General Quote',
        descricao: fullDescription,
        arquivo_url: arquivoUrl,
        arquivo_nome: arquivoNome,
        status: 'pendente',
        prioridade: 'media',
      });

      if (error) {
        console.error('Error submitting quote:', error);
        throw error;
      }

      toast({
        title: "Quote requested successfully!",
        description: selectedFile
          ? "We received your request and attachment. We will contact you shortly."
          : "We will contact you shortly.",
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        serviceType: "",
        projectDetails: "",
        budget: "",
        timeline: ""
      });
      handleRemoveFile();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error submitting quote request",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              {t('content:contact.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('content:contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <GlassCard key={info.title} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:shadow-glow-secondary transition-all duration-300">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{info.title}</h3>
                  <div className="space-y-2 mb-6">
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-muted-foreground text-sm">
                        {detail}
                      </p>
                    ))}
                  </div>
                  <GlassButton variant="outline" size="sm" className="w-full">
                    {info.action}
                  </GlassButton>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form and Map */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-8">
                {t('content:contact.form.title')}
              </h2>
              
              <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          className="pl-10 glass-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="pl-10 glass-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="pl-10 glass-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Field */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        type="text"
                        placeholder="Your Company Name"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className="pl-10 glass-input"
                      />
                    </div>
                  </div>

                  {/* Service Type */}
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Needed *</Label>
                    <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget and Timeline */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget Range</Label>
                      <Select value={formData.budget} onValueChange={(value) => handleInputChange("budget", value)}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-500">Under $500</SelectItem>
                          <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                          <SelectItem value="1000-5000">$1,000 - $5,000</SelectItem>
                          <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                          <SelectItem value="over-10000">Over $10,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline">Timeline</Label>
                      <Select value={formData.timeline} onValueChange={(value) => handleInputChange("timeline", value)}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Project timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">ASAP</SelectItem>
                          <SelectItem value="1-week">Within 1 week</SelectItem>
                          <SelectItem value="2-weeks">Within 2 weeks</SelectItem>
                          <SelectItem value="1-month">Within 1 month</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-2">
                    <Label htmlFor="projectDetails">Project Details *</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="projectDetails"
                        placeholder="Please describe your project, including dimensions, materials, location, and any specific requirements..."
                        value={formData.projectDetails}
                        onChange={(e) => handleInputChange("projectDetails", e.target.value)}
                        className="pl-10 glass-input min-h-[120px] resize-none"
                        required
                      />
                    </div>
                  </div>

                  {/* File Upload Field */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attach File / Project Reference (Optional)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload your logo, layout, artwork, sketch or document (PNG, JPG, PDF, SVG, AI, EPS, ZIP up to 25MB).
                    </p>

                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${
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
                          <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-primary hover:underline">
                              Click to upload
                            </span>{' '}
                            or drag and drop your file here
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Accepted formats: PDF, Images, Vector (AI/EPS/SVG), CAD, ZIP (Max 25MB)
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

                  {/* Submit Button */}
                  <GlassButton type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                    <Send className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Sending Quote Request..." : "Send Quote Request"}
                  </GlassButton>

                  <p className="text-sm text-muted-foreground text-center">
                    We'll respond within 2 hours during business hours
                  </p>
                </form>
              </GlassCard>
            </div>

            {/* Map and Additional Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-8">
                  Visit Our <span className="text-gradient">Showroom</span>
                </h2>
                
                <GlassCard className="p-8 mb-8">
                  {/* Placeholder for map */}
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center mb-6">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Interactive Map</p>
                      <p className="text-sm text-muted-foreground">
                        {companyInfo?.company_address || "123 Business Avenue, Suite 100, Your City, ST 12345"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Why Visit Our Showroom?</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gradient-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        See material samples and quality up close
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gradient-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        View completed projects and portfolio
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gradient-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        Meet our design team for consultation
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gradient-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        Get instant pricing and project timelines
                      </li>
                    </ul>
                  </div>
                </GlassCard>

                {/* Quick Contact */}
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Need Immediate Help?</h3>
                  <div className="space-y-3">
                    <GlassButton variant="outline" size="lg" className="w-full justify-start">
                      <Phone className="mr-3 h-5 w-5" />
                      Call: {companyInfo?.company_phone || "(555) 123-4567"}
                    </GlassButton>
                    <GlassButton variant="outline" size="lg" className="w-full justify-start">
                      <Mail className="mr-3 h-5 w-5" />
                      Email: {companyInfo?.company_email || "info@fbrsigns.com"}
                    </GlassButton>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
          </div>
          
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">How long does a typical project take?</h3>
              <p className="text-muted-foreground">
                Most projects are completed within 5-7 business days from approval. 
                Complex installations may take longer, and we'll provide a detailed timeline with your quote.
              </p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">Do you provide installation services?</h3>
              <p className="text-muted-foreground">
                Yes! We offer professional installation services with certified technicians. 
                All installations include a warranty and are completed to safety standards.
              </p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">Can you help with design if I don't have artwork?</h3>
              <p className="text-muted-foreground">
                Absolutely! Our design team can create custom artwork, logos, and layouts. 
                Design services start at $199 and are often included with larger projects.
              </p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">What materials do you use?</h3>
              <p className="text-muted-foreground">
                We use only premium materials including aluminum, acrylic, vinyl, LED components, 
                and weather-resistant inks. All materials come with manufacturer warranties.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}