import type { EntityManager } from 'typeorm';
import { NumberSequence } from '../../../database/entities/index.js';

function currentYearCode(date = new Date()): string {
  return String(date.getFullYear()).slice(-2);
}

export async function nextSequenceNumber(
  manager: EntityManager,
  sequenceKey: string,
  prefix: string,
  padLength = 6,
): Promise<string> {
  const yearCode = currentYearCode();
  const repo = manager.getRepository(NumberSequence);

  let sequence = await repo
    .createQueryBuilder('seq')
    .setLock('pessimistic_write')
    .where('seq.sequence_key = :sequenceKey', { sequenceKey })
    .andWhere('seq.year_code = :yearCode', { yearCode })
    .getOne();

  if (!sequence) {
    sequence = repo.create({
      sequenceKey,
      prefix,
      yearCode,
      lastNumber: 0,
      padLength,
    });
    await repo.save(sequence);
    sequence = await repo
      .createQueryBuilder('seq')
      .setLock('pessimistic_write')
      .where('seq.id = :id', { id: sequence.id })
      .getOne();
  }

  if (!sequence) {
    throw new Error(`Unable to allocate sequence for ${sequenceKey}`);
  }

  sequence.lastNumber += 1;
  await repo.save(sequence);

  const padded = String(sequence.lastNumber).padStart(sequence.padLength || padLength, '0');
  return `${sequence.prefix}-${sequence.yearCode}-${padded}`;
}
