-- Prac4TOEIC Listening Dialogues Data Seed
-- Tự động sinh bởi listening_pipeline

CREATE TABLE IF NOT EXISTS listening_dialogues (
    id BIGSERIAL PRIMARY KEY,
    part INT NOT NULL,
    question_range VARCHAR(50) NOT NULL,
    context TEXT,
    audio_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listening_turns (
    id BIGSERIAL PRIMARY KEY,
    dialogue_id BIGINT REFERENCES listening_dialogues(id) ON DELETE CASCADE,
    turn_order INT NOT NULL,
    speaker VARCHAR(50) NOT NULL,
    text TEXT NOT NULL
);

-- Dialogue #1 (Part 3 - Q32-34)
INSERT INTO listening_dialogues (id, part, question_range, context, audio_url) VALUES (1, 3, '32-34', 'A phone call regarding a furniture delivery confirmation', '/uploads/listening/listening_p3_q32_34.wav') ON CONFLICT (id) DO NOTHING;
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 1, 'Narrator', 'Questions 32 through 34 refer to the following conversation.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 2, 'Man', 'Hello Ms. Tanaka, this is David from Apex Logistics. I''m calling to confirm your shipment of office furniture scheduled for delivery this Thursday afternoon.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 3, 'Woman', 'Oh hello David! Yes, I was just checking our inventory space. Will the drivers be able to help unload the items onto the second floor? Our elevator is temporarily out of service today.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 4, 'Man', 'Absolutely. I will assign two extra movers to your truck to ensure everything gets placed directly in the main conference room without any delay.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 5, 'Woman', 'That''s wonderful news! Please email me the updated delivery confirmation form so I can notify our facilities manager.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 6, 'Narrator', 'Number 32. Why is the man calling?');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 7, 'Narrator', 'Number 33. What problem does the woman mention?');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (1, 8, 'Narrator', 'Number 34. What will the woman probably do next?');

-- Dialogue #2 (Part 3 - Q35-37)
INSERT INTO listening_dialogues (id, part, question_range, context, audio_url) VALUES (2, 3, '35-37', 'Discussion about a marketing budget report before a meeting', '/uploads/listening/listening_p3_q35_37.wav') ON CONFLICT (id) DO NOTHING;
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 1, 'Narrator', 'Questions 35 through 37 refer to the following conversation.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 2, 'Woman', 'Excuse me, Carlos. Have you finished reviewing the quarterly budget reports for the marketing department? The executive committee meets at three o''clock.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 3, 'Man', 'I''m almost done, Rachel. The digital advertising expenses were higher than projected, but overall we stayed within our target range.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 4, 'Woman', 'That''s reassuring. Could you print five copies of the final summary slide before the meeting begins?');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 5, 'Man', 'Sure thing. I''ll print them out right away and bring them to meeting room B.');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 6, 'Narrator', 'Number 35. What are the speakers discussing?');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 7, 'Narrator', 'Number 36. What does the man say about the digital advertising expenses?');
INSERT INTO listening_turns (dialogue_id, turn_order, speaker, text) VALUES (2, 8, 'Narrator', 'Number 37. What does the woman ask the man to do?');
