/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { SectionsService } from "./sections.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Controller("projects")
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post(":projectId/sections")
  create(
    @Param("projectId") projectId: string,
    @Body() createSectionDto: CreateSectionDto
  ) {
    return this.sectionsService.create({
      ...createSectionDto,
      project: projectId,
    });
  }

  @Get(":projectId/sections")
  findAll(@Param("projectId") projectId: string) {
    return this.sectionsService.findAll(projectId);
  }

  @Get(":projectId/sections/:id")
  findOne(@Param("projectId") projectId: string, @Param("id") id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch(":projectId/sections/:id")
  update(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() updateSectionDto: UpdateSectionDto
  ) {
    return this.sectionsService.update(id, updateSectionDto);
  }

  @Delete(":projectId/sections/:id")
  remove(@Param("projectId") projectId: string, @Param("id") id: string) {
    return this.sectionsService.remove(id);
  }

  @Patch(":projectId/reorder-sections")
  async reorderSections(
    @Param("projectId") projectId: string,
    @Body() { sectionIds }: { sectionIds: string[] }
  ) {
    try {
      return await this.sectionsService.reorderSections(projectId, sectionIds);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to reorder sections",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
