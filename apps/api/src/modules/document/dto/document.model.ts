import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * GraphQL object type representing a stored document.
 */
@ObjectType()
export class DocumentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  candidateId!: string;

  @Field(() => String, { description: 'Document type: Resume, OfferLetter, or Nda' })
  type!: string;

  @Field(() => String)
  s3Key!: string;

  @Field(() => String, { nullable: true })
  originalFilename?: string | null;

  @Field(() => Int, { nullable: true })
  fileSizeBytes?: number | null;

  @Field(() => String)
  createdAt!: string;
}
