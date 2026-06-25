ALTER TABLE `CalendarEvent`
  ADD COLUMN IF NOT EXISTS `clientId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `dogId` VARCHAR(191) NULL;

CREATE INDEX IF NOT EXISTS `CalendarEvent_clientId_idx` ON `CalendarEvent` (`clientId`);
CREATE INDEX IF NOT EXISTS `CalendarEvent_dogId_idx` ON `CalendarEvent` (`dogId`);

UPDATE `CalendarEvent` AS e
JOIN `ClientProfile` AS c
  ON c.`trainerId` = e.`trainerId`
 AND c.`name` = e.`client`
LEFT JOIN `Dog` AS d
  ON d.`clientId` = c.`id`
 AND d.`name` = e.`dog`
SET
  e.`clientId` = COALESCE(e.`clientId`, c.`id`),
  e.`dogId` = COALESCE(e.`dogId`, d.`id`)
WHERE e.`clientId` IS NULL OR e.`dogId` IS NULL;
