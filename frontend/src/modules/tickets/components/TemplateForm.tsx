/**
 * TemplateForm Component
 * Form for creating and editing response templates
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Loader2, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  useCreateTemplate,
  useUpdateTemplate,
  usePreviewTemplate,
  useValidateTemplate,
  useTemplateVariables,
} from '../hooks/useTemplates';
import type { ResponseTemplate } from '../types/template.types';
import { TemplateCategory, SYSTEM_VARIABLES, CUSTOM_VARIABLES, SAMPLE_VARIABLES } from '../types/template.types';

interface TemplateFormProps {
  template?: ResponseTemplate;
  onSuccess?: (template: ResponseTemplate) => void;
  onCancel?: () => void;
}

const formSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must be less than 255 characters'),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters'),
  category: z.nativeEnum(TemplateCategory),
  is_default: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.TECHNICAL]: 'Technical Support',
  [TemplateCategory.BILLING]: 'Billing Inquiry',
  [TemplateCategory.GENERAL]: 'General Question',
  [TemplateCategory.URGENT]: 'Urgent Issue',
  [TemplateCategory.ESCALATION]: 'Escalation',
  [TemplateCategory.CLOSING]: 'Ticket Closing',
  [TemplateCategory.ACKNOWLEDGMENT]: 'Acknowledgment',
};

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSuccess,
  onCancel,
}) => {
  const [previewText, setPreviewText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate(template?.id || '');
  const previewMutation = usePreviewTemplate();
  const validateMutation = useValidateTemplate();
  const { data: variables } = useTemplateVariables();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: template?.title || '',
      content: template?.content || '',
      category: template?.category || TemplateCategory.GENERAL,
      is_default: template?.is_default || false,
    },
  });

  const content = form.watch('content');

  // Auto-generate preview when content changes
  useEffect(() => {
    const generatePreview = async () => {
      if (!content) {
        setPreviewText('');
        return;
      }

      try {
        const result = await previewMutation.mutateAsync({
          content,
          variables: SAMPLE_VARIABLES,
        });
        setPreviewText(result.rendered_content);
      } catch (error) {
        setPreviewText(content);
      }
    };

    const timer = setTimeout(generatePreview, 500);
    return () => clearTimeout(timer);
  }, [content]);

  const onSubmit = async (data: FormData) => {
    try {
      let result: ResponseTemplate;

      if (template) {
        result = await updateMutation.mutateAsync(data);
      } else {
        result = await createMutation.mutateAsync(data);
      }

      onSuccess?.(result);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const insertVariable = (variableName: string) => {
    const currentContent = form.getValues('content');
    const cursorPos = document.querySelector('textarea')?.selectionStart || currentContent.length;

    const newContent =
      currentContent.slice(0, cursorPos) +
      variableName +
      currentContent.slice(cursorPos);

    form.setValue('content', newContent);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {template ? 'Edit Template' : 'Create New Template'}
            </CardTitle>
            <CardDescription>
              {template
                ? 'Update the template details'
                : 'Create a new response template for quick replies'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title Field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Password Reset Instructions"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A short, descriptive name for this template
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Field */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Helps organize templates by type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content Field */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Template Content</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Enter template content. Use {{variable_name}} for dynamic content."
                          rows={12}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        <div className="mt-2">
                          <strong>Character count:</strong> {field.value.length} / 5000
                        </div>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Default Checkbox */}
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Set as default template
                        </FormLabel>
                        <FormDescription>
                          This template will be pre-selected when composing replies
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {template ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>{template ? 'Update Template' : 'Create Template'}</>
                    )}
                  </Button>
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="space-y-4">
        {/* Preview Panel */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {previewText || 'Preview will appear here...'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Variables Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Template Variables</CardTitle>
            <CardDescription className="text-xs">
              Click to insert into content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-2 mt-4">
                {SYSTEM_VARIABLES.map((variable) => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-auto py-2"
                    onClick={() => insertVariable(variable.name)}
                    title={variable.description}
                  >
                    <span className="font-mono">{variable.name}</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                ))}
              </TabsContent>

              <TabsContent value="custom" className="space-y-2 mt-4">
                {CUSTOM_VARIABLES.map((variable) => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-auto py-2"
                    onClick={() => insertVariable(variable.name)}
                    title={variable.description}
                  >
                    <span className="font-mono">{variable.name}</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                ))}
              </TabsContent>
            </Tabs>

            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
              <strong>Tip:</strong> Variables will be replaced with actual values when the
              template is used.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
