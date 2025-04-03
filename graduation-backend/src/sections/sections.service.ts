/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { Section } from "./schema/sections.schema";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { Project } from "../projects/schema/projects.schema";

@Injectable()
export class SectionsService {
  private readonly logger = new Logger(SectionsService.name);
  constructor(
    @InjectModel(Section.name) private sectionModel: Model<Section>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectConnection() private connection: Connection
  ) {}

  // Add these missing methods:

  async create(createSectionDto: CreateSectionDto): Promise<Section> {
    const session = await this.sectionModel.db.startSession();
    session.startTransaction();

    try {
      const section = new this.sectionModel(createSectionDto);
      await section.save({ session });

      // Update the project's sections array
      await this.projectModel
        .findByIdAndUpdate(
          createSectionDto.project,
          { $push: { sections: section._id } },
          { new: true, session }
        )
        .exec();

      await session.commitTransaction();
      return section;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findAll(projectId: string): Promise<Section[]> {
    return this.sectionModel
      .find({ project: projectId })
      .sort('order')
      .exec();
  }

  async findOne(id: string): Promise<Section> {
    return this.sectionModel.findById(id).exec();
  }

  async update(id: string, updateSectionDto: UpdateSectionDto): Promise<Section> {
    const session = await this.sectionModel.db.startSession();
    session.startTransaction();

    try {
      // First get the current section to preserve the order
      const currentSection = await this.sectionModel.findById(id).session(session);
      if (!currentSection) {
        throw new Error('Section not found');
      }

      // Update while preserving the order field
      const section = await this.sectionModel
        .findByIdAndUpdate(
          id,
          { ...updateSectionDto, order: currentSection.order },
          { new: true, session }
        )
        .exec();

      await session.commitTransaction();
      return section;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async remove(id: string): Promise<void> {
    const session = await this.sectionModel.db.startSession();
    session.startTransaction();

    try {
      const section = await this.sectionModel.findById(id).session(session);
      if (!section) {
        throw new Error('Section not found');
      }

      // Remove section from project's sections array
      await this.projectModel
        .findByIdAndUpdate(
          section.project,
          { $pull: { sections: section._id } },
          { session }
        )
        .exec();

      // Delete the section
      await this.sectionModel.findByIdAndDelete(id).session(session).exec();

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Keep your existing reorderSections method
  async reorderSections(projectId: string, sectionIds: string[]): Promise<Section[]> {
    const session = await this.connection.startSession();
    try {
        session.startTransaction();

        // Find the project and verify it exists
        const project = await this.projectModel.findById(projectId).session(session);
        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Verify all sections exist and belong to the project
        const sections = await this.sectionModel
            .find({ _id: { $in: sectionIds } })
            .session(session);

        if (sections.length !== sectionIds.length) {
            throw new BadRequestException('Some sections were not found');
        }

        // Verify all sections belong to this project
        const sectionsNotInProject = sections.filter(
            section => section.project.toString() !== projectId
        );
        if (sectionsNotInProject.length > 0) {
            throw new BadRequestException('Some sections do not belong to this project');
        }

        // Update the order of each section
        const updatePromises = sectionIds.map((sectionId, index) => {
            return this.sectionModel
                .findByIdAndUpdate(
                    sectionId,
                    { $set: { order: index } },
                    { new: true, session }
                )
                .exec();
        });

        const updatedSections = await Promise.all(updatePromises);

        // Update the project's sections array to match the new order
        project.sections = sectionIds.map(id => new Types.ObjectId(id));
        await project.save({ session });

        await session.commitTransaction();
        return updatedSections;

    } catch (error) {
        await session.abortTransaction();
        this.logger.error(`Failed to reorder sections: ${error.message}`, error.stack);
        throw error;
    } finally {
        await session.endSession();
    }
}
}