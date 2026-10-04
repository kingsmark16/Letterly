DROP INDEX "Category_status_displayOrder_idx";
CREATE INDEX "Category_status_displayOrder_id_idx"
  ON "Category"("status", "displayOrder", "id");

DROP INDEX "Template_categoryId_status_displayOrder_idx";
CREATE INDEX "Template_status_displayOrder_id_idx"
  ON "Template"("status", "displayOrder", "id");
CREATE INDEX "Template_categoryId_status_displayOrder_id_idx"
  ON "Template"("categoryId", "status", "displayOrder", "id");

DROP INDEX "TemplateVersion_templateId_status_idx";
CREATE INDEX "TemplateVersion_templateId_status_version_idx"
  ON "TemplateVersion"("templateId", "status", "version");
