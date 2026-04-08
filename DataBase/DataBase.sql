CREATE TABLE Users
(
	Id SERIAL PRIMARY KEY,
	Username VARCHAR(30) UNIQUE,
	User_role VARCHAR(30),
	Email VARCHAR(30) UNIQUE,
	User_password VARCHAR(30)
);

CREATE TABLE Orders
(
	Id SERIAL PRIMARY KEY,
	Title VARCHAR(60),
	CustomerId INTEGER,
	Created_at VARCHAR(30),
	Task_type VARCHAR(30),
	Status VARCHAR(30),
	Description VARCHAR(300),
	FOREIGN KEY (CustomerId) REFERENCES Users (Id)
);

CREATE TABLE DataItems
(
	Id SERIAL PRIMARY KEY,
	OrderId INTEGER,
	Created_at VARCHAR(30),
	File_path VARCHAR(60),
	FOREIGN KEY (OrderId) REFERENCES Orders (Id)
);

CREATE TABLE Labels
(
	Id SERIAL PRIMARY KEY,
	WorkerId INTEGER,
	DataItemId INTEGER,
	Created_at VARCHAR(30),
	LabelType VARCHAR(30),
	FOREIGN KEY (WorkerId) REFERENCES Users (Id),
	FOREIGN KEY (DataItemId) REFERENCES DataItems (Id)
);

CREATE TABLE BoundingBoxes
(
	Id SERIAL PRIMARY KEY,
	LabelId INTEGER,
	DefClass VARCHAR(60),
	X_Max DOUBLE PRECISION,
	Y_Max DOUBLE PRECISION,
	X_Min DOUBLE PRECISION,
	Y_Min DOUBLE PRECISION,
	FOREIGN KEY (LabelId) REFERENCES Labels (Id)
);

CREATE TABLE ClassificationLabels
(
	Id SERIAL PRIMARY KEY,
	ClassName VARCHAR(60),
	LabelId INTEGER,
	FOREIGN KEY (LabelId) REFERENCES Labels (Id)
);
