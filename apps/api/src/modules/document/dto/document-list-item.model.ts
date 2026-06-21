import { ObjectType, Field, Int } from '@nestjs/graphql';

/** Minimal candidate info for document list rows. */
@ObjectType('DocumentCandidate')
export class DocumentCandidateSummary {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}

/** Document with nested candidate for the global documents list. */
@ObjectType('DocumentListItem')
export class DocumentListItemModel {
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

  @Field(() => DocumentCandidateSummary)
  candidate!: DocumentCandidateSummary;
}
