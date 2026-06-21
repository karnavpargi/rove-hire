import { ObjectType, Field } from '@nestjs/graphql';

/**
 * GraphQL output type for the result of offer document generation.
 */
@ObjectType()
export class OfferDocumentsOutput {
  @Field(() => String, { description: 'Pre-signed URL for the generated offer letter PDF' })
  offerLetterUrl!: string;

  @Field(() => String, { description: 'Pre-signed URL for the generated NDA PDF' })
  ndaUrl!: string;

  @Field(() => String, { description: 'Document ID of the offer letter' })
  offerLetterId!: string;

  @Field(() => String, { description: 'Document ID of the NDA' })
  ndaId!: string;
}
