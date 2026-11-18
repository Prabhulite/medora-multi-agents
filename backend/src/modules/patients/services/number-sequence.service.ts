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
  await manager.query(
    'INSERT INTO `number_sequences` (`sequence_key`, `prefix`, `year_code`, `last_number`, `pad_length`) VALUES (?, ?, ?, 1, ?) ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1',
    [sequenceKey, prefix, yearCode, padLength],
  );
  const sequence = await repo
    .createQueryBuilder('seq')
    .setLock('pessimistic_write')
    .where('seq.sequence_key = :sequenceKey', { sequenceKey })
    .andWhere('seq.year_code = :yearCode', { yearCode })
    .getOne();

  if (!sequence) {
    throw new Error(`Unable to allocate sequence for ${sequenceKey}`);
  }

  const padded = String(sequence.lastNumber).padStart(sequence.padLength || padLength, '0');
  return `${sequence.prefix}-${sequence.yearCode}-${padded}`;
}
