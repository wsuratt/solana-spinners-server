CREATE TABLE users (
  id VARCHAR (255) UNIQUE NOT NULL,
  num_spins INTEGER
);

INSERT INTO
  users (
    ID,
    num_spins
  )
VALUES
  (
    '512CDVq78BQpKxb6RyPa9pYiqU2Z8jr7XYaUWBQrYwHt',
    1
  );

CREATE TABLE transactions (sig VARCHAR (255) UNIQUE NOT NULL);

INSERT INTO
  transactions (sig)
VALUES
  (
    '2ekdaBKR3beTxwQ34xptZ1tFojmKSFv3rd2W55DBvseKLyEQrofczHp4HuBbx4oFPujGWbDheMSp6izTR7kzCSg4'
  );

CREATE TABLE prizes (
  mint VARCHAR (255) UNIQUE NOT NULL,
  winner VARCHAR (255) UNIQUE
);

INSERT INTO
  prizes (
    mint,
    winner
  )
VALUES
  (
    'A9tNwrcznAaNRN99Uz86J6vgcLQJMBRpdcpL6dDmirV1',
    NULL
  );
