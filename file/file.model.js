const mysql = require("mysql");

const connectionProperties = {
  connectionLimit: 3,
  host: "localhost",
  user: "c0nodestdplan",
  password: "Fbzb#N29",
  database: "c0stdplandb1",
};

const crypto = require("crypto");

class Database {
  constructor(connectionProperties) {
    this.connection = mysql.createConnection(connectionProperties);
  }
  query(sql, params) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result);
      });
    });
  }
  queryClose(sql, params) {
    const ret = this.query(sql, params);
    this.close();
    return ret;
  }
  close() {
    return new Promise((resolve, reject) =>
      this.connection.end(() => resolve())
    );
  }
}

let data = [];

async function save(file2, firstSheet) {
  const { format, addDays } = require("date-fns");
  const { utcToZonedTime } = require("date-fns-tz");

  const targetTimeZone = "Europe/Rome";
  let formatedDate;
  let plan;
  let database;
  let wid = null;
  let currentRow = null;

  try {
    database = new Database(connectionProperties);
    let endeerreicht = false;
    await database.query("START TRANSACTION");
    for (const [rowIndex, row] of firstSheet.data.entries()) {
      if (row[0] == "Studio") {
        endeerreicht = true;
      }
      if (!endeerreicht && rowIndex == 1) {
        //getting Startdate
        const XLSdate = row[6];
        const baseDate = new Date("1904-01-01");
        const parsedXLSdate = parseFloat(XLSdate, 10);
        if (!parsedXLSdate) {
          throw new Error(
            "Das Datum für den Wochenanfang konnte nicht gelesen werden"
          );
        }
        date = addDays(baseDate, parsedXLSdate);

        const zonedDate = utcToZonedTime(date, targetTimeZone);

        formatedDate = format(zonedDate, "yyyy-MM-dd");

        //getting UploadDate
        const uploadDatum = new Date(Date.now());
        const formatedUploadDatum = format(uploadDatum, "yyyy-MM-dd");

        //getting XLS file
        const XLS = file2.data;

        plan = {
          start: formatedDate,
          upload: formatedUploadDatum,
          xlsfile: XLS,
        };

        // sql Query to insert Wochenplan into DB
        const sqlWeek = `
        INSERT INTO wochenplaene(wwochenstartdatum,wuploaddatum,wexcel)
        VALUES (?,?,?)`;

        // Values used to insert Wochenplan
        const valuesWeek = [plan.start, plan.upload, plan.xlsfile];

        // Inserting Week
        result = await database.query(sqlWeek, valuesWeek);

        wid = result.insertId;
      }
      if (!endeerreicht && rowIndex > 5) {
        const file1 = {
          name: row[0] !== undefined ? row[0] : "",
          montag: row[1] !== undefined ? row[1].toUpperCase() : "",
          dienstag: row[2] !== undefined ? row[2].toUpperCase() : "",
          mittwoch: row[3] !== undefined ? row[3].toUpperCase() : "",
          donnerstag: row[4] !== undefined ? row[4].toUpperCase() : "",
          freitag: row[5] !== undefined ? row[5].toUpperCase() : "",
          samstag: row[6] !== undefined ? row[6].toUpperCase() : "",
          sonntag: row[7] !== undefined ? row[7].toUpperCase() : "",
        };
        const shortenDay = (day) => {
          const index = file1[day].indexOf(" ");
          if (index !== -1) {
            file1[day] = file1[day].slice(0, index);
          }
        };

        [
          "montag",
          "dienstag",
          "mittwoch",
          "donnerstag",
          "freitag",
          "samstag",
          "sonntag",
        ].forEach(shortenDay);

        let lastName = "";

        // Find the first uppercase character
        let firstUpperCaseIndex = -1;
        for (var i = 0; i < file1.name.length; i++) {
          if (file1.name[i] === file1.name[i].toUpperCase()) {
            firstUpperCaseIndex = i;
            lastName = file1.name[i];
            break;
          }
        }

        // Collect uppercase characters for lastName
        for (var i = firstUpperCaseIndex + 1; i < file1.name.length; i++) {
          if (file1.name[i] === file1.name[i].toUpperCase()) {
            lastName = lastName + file1.name[i];
          } else {
            break; // Stop when a lowercase character is encountered
          }
        }

        let firstName = "";
        lastName = lastName.slice(0, lastName.length - 1);

        // Collect lowercase characters for firstName
        for (
          var i = firstUpperCaseIndex + lastName.length;
          i < file1.name.length;
          i++
        ) {
          firstName = firstName + file1.name[i];
        }

        lastName = lastName.trim();
        firstName = firstName.trim();

        // sql Query to get mid from DB
        const sql1 = `
         SELECT mid
         FROM mitarbeiter
         WHERE mname = ? and mfname = ?`;

        // sql Query to insert data into DB
        const sql2 = `
         INSERT INTO arbeiterwochen(wid, mid, awmontag, awdienstag, awmittwoch, awdonnerstag, awfreitag, awsamstag, awsonntag)
         VALUES (?,?,?,?,?,?,?,?,?)`;

        let plusIndex = null;
        if (file1.montag.indexOf("+") != -1) {
          plusIndex = file1.montag.indexOf("+");
          file1.montag = file1.montag.substring(0, plusIndex);
        }
        if (file1.dienstag.indexOf("+") != -1) {
          plusIndex = file1.dienstag.indexOf("+");
          file1.dienstag = file1.dienstag.substring(0, plusIndex);
        }
        if (file1.mittwoch.indexOf("+") != -1) {
          plusIndex = file1.mittwoch.indexOf("+");
          file1.mittwoch = file1.mittwoch.substring(0, plusIndex);
        }
        if (file1.donnerstag.indexOf("+") != -1) {
          plusIndex = file1.donnerstag.indexOf("+");
          file1.donnerstag = file1.donnerstag.substring(0, plusIndex);
        }
        if (file1.freitag.indexOf("+") != -1) {
          plusIndex = file1.freitag.indexOf("+");
          file1.freitag = file1.freitag.substring(0, plusIndex);
        }
        if (file1.samstag.indexOf("+") != -1) {
          plusIndex = file1.samstag.indexOf("+");
          file1.samstag = file1.samstag.substring(0, plusIndex);
        }
        if (file1.sonntag.indexOf("+") != -1) {
          plusIndex = file1.sonntag.indexOf("+");
          file1.sonntag = file1.sonntag.substring(0, plusIndex);
        }

        // Values used to insert data
        const values = [
          file1.montag,
          file1.dienstag,
          file1.mittwoch,
          file1.donnerstag,
          file1.freitag,
          file1.samstag,
          file1.sonntag,
        ];

        let mid = null;
        currentRow = rowIndex;

        // SQL
        // Getting mid
        mid = await database.query(sql1, [firstName, lastName]);
        mid = mid[0].mid;

        // Inserting Row
        await database.query(sql2, [wid, mid, ...values]);
      }
    }
    // commit
    await database.query("COMMIT");
    return Promise.resolve("Daten erfolgreich importiert");
  } catch (error) {
    await database.query("ROLLBACK");;
    console.log(error);
    currentRow += 1;
    return Promise.reject(error.message.concat("Current Row:" + currentRow));
  }
}

async function getUser(username, password) {
  try {
    let database = new Database(connectionProperties);
    if (!username || !password) {
      return Promise.reject("User not set");
    } else {
      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
      const sql = `
          SELECT mid, mname, mfname, mpasswort, memail, bid
          FROM mitarbeiter
          WHERE memail = ? AND mpasswort = ?
          `;
      return new Promise(async (resolve, reject) => {
        result = await database.query(sql, [username, passwordHash]);

        if (!result || result.length === 0) {
          reject("User not found");
        } else {
          resolve(result[0]);
        }
      });
    }
  } catch (error) {
    return Promise.reject(error);
  }
}

function getAll() {
  return data;
}
function remove(uid) {
  data = data.filter((file) => file.uid !== uid);
}
function get(uid) {
  return data.find((file) => file.uid === uid);
}

async function getUserList(callback) {
  try {
    let database = new Database(connectionProperties);
    const sql = `
    select m.mid as mid,mfname,mname,awdienst,COUNT(*) as count
    FROM viewarbeitswochen aw, mitarbeiter m
      WHERE aw.mid = m.mid
      GROUP BY mfname,mname,awdienst
      ORDER BY 1,2,4 DESC
  `;

    result = await database.queryClose(sql);
    callback(null, result);
  } catch (error) {
    callback("Database error", null);
  }
}

async function getSpecificList(ID, callback) {
  try {
    let database = new Database(connectionProperties);
    const sql = `
    select m.mid as mid,mfname,mname,awdienst,COUNT(*) AS count
    FROM viewarbeitswochen aw, mitarbeiter m
      WHERE aw.mid = m.mid
      GROUP BY mfname,mname,awdienst
      ORDER BY 1,2,4 DESC 
    `;

    result = await database.queryClose(sql);
    callback(null, result);
  } catch (error) {
    callback("Database error", null);
  }
}

async function getTaetigkeiten(callback) {
  try {
    let database = new Database(connectionProperties);
    const sql = `SELECT * 
                FROM taetigkeiten`;

    result = await database.queryClose(sql);

    callback(null, result);
  } catch (error) {
    callback("Database error", null);
  }
}

async function addUser(user) {
  try {
    const database = new Database(connectionProperties);

    const passwordHash = crypto
      .createHash("sha256")
      .update(user.mpasswort)
      .digest("hex");

    const sql = `INSERT INTO mitarbeiter(bid, memail, mfname, mname, mpasswort)
                  VALUES (?, ?, ?, ?, ?)`;

    const result = await database.queryClose(sql, [
      user.bid,
      user.memail,
      user.mfname,
      user.mname,
      passwordHash,
    ]);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function taetigkeitHinzufügen(taetigkeit) {
  try {
    const database = new Database(connectionProperties);
    const sql = `INSERT INTO taetigkeiten(tname, tbeschreibung)
                  VALUES (?, ?)`;

    const result = await database.queryClose(sql, [
      taetigkeit.tname,
      taetigkeit.tbeschreibung,
    ]);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getMitarbeiter(callback) {
  try {
    const database = new Database(connectionProperties);
    const sql = `SELECT mname,mfname,memail,mpasswort,bid,mid
                  FROM mitarbeiter`;
    const result = await database.queryClose(sql);
    callback(null, result);
  } catch (error) {
    callback("Database error", null);
  }
}

async function getMitarbeiterbyID(id) {
  try {
    const database = new Database(connectionProperties);
    const sql = `SELECT * 
                  FROM mitarbeiter
                  WHERE mid = ?`;

    const result = await database.queryClose(sql, id);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function updateUser(user) {
  try {
    const database = new Database(connectionProperties);

    const passwordHash = crypto
      .createHash("sha256")
      .update(user.mpasswort)
      .digest("hex");

    const sql = `UPDATE mitarbeiter 
                  SET mname = ?, memail = ?, mpasswort = ?, bid = ?, mfname = ?
                  WHERE mid = ${user.mid}`;

    const result = await database.queryClose(sql, [
      user.mname,
      user.memail,
      passwordHash,
      user.bid,
      user.mfname,
    ]);
    return Promise.resolve(result);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
}

async function deleteTaetigkeit(tname) {
  try {
    const database = new Database(connectionProperties);

    const sql = `DELETE FROM taetigkeiten 
                  WHERE (tname = ?)`;

    const result = await database.queryClose(sql, [tname]);
    return Promise.resolve(result);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
}

async function updateTaetigkeit(taetigkeit) {
  try {
    const database = new Database(connectionProperties);

    const sql = `UPDATE taetigkeiten 
                  SET tname = ?, tbeschreibung = ?
                  WHERE (tname = ?)`;

    const result = await database.queryClose(sql, [
      taetigkeit.tnameneu,
      taetigkeit.tbeschreibung,
      taetigkeit.tnamealt,
    ]);
    return Promise.resolve(result);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
}

async function deleteUser(mid) {
  try {
    const database = new Database(connectionProperties);

    const sql = `DELETE FROM mitarbeiter 
                  WHERE mid = ${mid}`;

    const result = await database.queryClose(sql);
    return Promise.resolve(result);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
}

async function getTaetigkeit(name) {
  try {
    const database = new Database(connectionProperties);
    const sql = `SELECT * 
                  FROM taetigkeiten
                  WHERE tname = ?`;

    const result = await database.queryClose(sql, name);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getStundenplan(mid) {
  try {
    const database = new Database(connectionProperties);
    const sql = `SELECT awmontag, awdienstag, awmittwoch, awdonnerstag, awfreitag, awsamstag, awsonntag, wwochenstartdatum
                  FROM arbeiterwochen, wochenplaene
                  WHERE mid = ? 
                  AND arbeiterwochen.wid = wochenplaene.wid
                  AND arbeiterwochen.wid = (
                      SELECT wid
                      FROM wochenplaene
                      WHERE wwochenstartdatum = (
                          SELECT MAX(wwochenstartdatum)
                          FROM wochenplaene
                      )
                  );`;
    const result = await database.queryClose(sql, mid);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

module.exports = {
  getAll,
  remove,
  get,
  save,
  getUser,
  getUserList,
  getSpecificList,
  getTaetigkeiten,
  addUser,
  getMitarbeiter,
  getMitarbeiterbyID,
  updateUser,
  deleteTaetigkeit,
  taetigkeitHinzufügen,
  updateTaetigkeit,
  deleteUser,
  getTaetigkeit,
  getStundenplan,
};
