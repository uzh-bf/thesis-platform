-- Supervisors and their topic areas move from the SharePoint "Thesis
-- Supervisors" list into the app. Student submissions are announced to the
-- supervisors of the submitted topic area who enabled notifications.
ALTER TABLE "User" ADD COLUMN "supervisorSubmissionNotifications" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "_SupervisorTopicAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SupervisorTopicAreas_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_SupervisorTopicAreas_B_index" ON "_SupervisorTopicAreas"("B");

ALTER TABLE "_SupervisorTopicAreas" ADD CONSTRAINT "_SupervisorTopicAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "TopicArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_SupervisorTopicAreas" ADD CONSTRAINT "_SupervisorTopicAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
