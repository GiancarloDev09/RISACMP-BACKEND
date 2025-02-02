const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const multer = require('multer'); // Importa multer

//Implementacion de AWS para la carga de archivos y documentos
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

// Configura AWS S3
const s3 = new AWS.S3({
  accessKeyId: 'AKIA4MTWJXPAMMTCXCVI',
  secretAccessKey: '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',
});

// Configura multer para cargar archivos en S3
const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'awsrisacmpproyect',
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

// Exportar multer upload para usarlo en las rutas


// Configuración de multer para carga de archivos local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
// Exportar multer uploadS3 para usarlo en las rutas
exports.uploadS3 = uploadS3;

// Exportar multer upload para usarlo en las rutas
exports.upload = upload;


exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        username:user.username,
        role: user.role, // Asegúrate de incluir el rol del usuario en el payload del token JWT
        nombres:user.nombres,
        apellidos:user.apellidos,
        tipoDocumento:user.tipoDocumento,
        numeroDocumento:user.numeroDocumento,
        telefono:user.telefono,
        sexo:user.sexo,
      },
    };

    jwt.sign(payload, 'secretKey', { expiresIn: '1h' }, (err, token) => {
      if (err) {
        res.status(500).json({ msg: 'Error al generar el token' });
      } else {
        // Envía el token y el rol del usuario en la respuesta
        res.json({ token,username:user.username, 
          role:user.role,nombres:user.nombres,
          apellidos:user.apellidos,
          tipoDocumento:user.tipoDocumento,numeroDocumento:user.numeroDocumento,
          telefono:user.telefono,
          sexo:user.sexo});
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};




exports.register = async (req, res) => {
  const { username, password, role, nombres, apellidos, tipoDocumento, numeroDocumento, telefono, sexo } = req.body;
  const cv = req.file ? req.file.path : null; // Obtener la ruta del archivo si se carga

  try {
    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      password,
      role,
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      telefono,
      sexo,
      cv, // Guardar la ruta del archivo
    });
    if (req.file) {
      const fileUrl = req.file.location; // Obtiene la URL del archivo en S3
      user.cv = fileUrl;
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};







  exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  exports.getUserById = async (req, res) => {
    const userId = req.params.id;
  
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  exports.updateUserById = async (req, res) => {
    const userId = req.params.id;
    const { username, password, nombres, apellidos, sexo, tipoDocumento, numeroDocumento, telefono, role } = req.body;

    try {
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Actualizar campos solo si se proporcionan nuevos valores desde el frontend
        if (username) user.username = username;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        if (nombres) user.nombres = nombres;
        if (apellidos) user.apellidos = apellidos;
        if (sexo) user.sexo = sexo;
        if (tipoDocumento) user.tipoDocumento = tipoDocumento;
        if (numeroDocumento) user.numeroDocumento = numeroDocumento;
        if (telefono) user.telefono = telefono;
        if (role) user.role = role; // Asegúrate de incluir role en la desestructuración para evitar errores

        await user.save();

        res.json({ msg: 'User updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

  
  
  exports.deleteUserById = async (req, res) => {
    const userId = req.params.id;
  
    try {
      let user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      await User.findByIdAndDelete(userId);
  
      res.json({ msg: 'User deleted successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  exports.exportUsersToPDF = async (req, res) => {
    try {
        const users = await User.find();

        // Crear un nuevo documento PDF
        const doc = new PDFDocument();

        // Configurar la respuesta HTTP con el tipo de contenido
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios.pdf"');

        // Pipe el documento PDF directamente a la respuesta HTTP
        doc.pipe(res);

        // Agregar contenido al documento PDF
        doc.fontSize(20).text('Lista de Usuarios', { align: 'center' });
        doc.moveDown();

        users.forEach(user => {
            doc.fontSize(12).text(`Nombre: ${user.username}`);
            doc.fontSize(12).text(`Rol: ${user.role}`);
            doc.fontSize(12).text(`Nombres: ${user.nombres}`);
            doc.fontSize(12).text(`Apellidos: ${user.apellidos}`);
            doc.fontSize(12).text(`Tipo de documento: ${user.tipoDocumento}`);
            doc.fontSize(12).text(`Numero de documento: ${user.numeroDocumento}`);
            doc.fontSize(12).text(`Telefono: ${user.telefono}`);
            doc.fontSize(12).text(`Sexo: ${user.sexo}`);
            // Agrega más campos de usuario según sea necesario
            doc.moveDown();
        });

        // Finaliza el documento PDF
        doc.end();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

exports.exportUsersToExcel = async (req, res) => {
    try {
        const users = await User.find();

        // Crear un nuevo workbook de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Usuarios');

        // Agregar encabezados de columna
        worksheet.columns = [
            { header: 'Nombre', key: 'username', width: 20 },
            { header: 'Rol', key: 'role', width: 20 },
            { header: 'Nombres', key: 'nombres', width: 20 },
            { header: 'Apellidos', key: 'apellidos', width: 20 },
            { header: 'Tipo de documento', key: 'tipoDocumento', width: 20 },
            { header: 'Numero de documento', key: 'numeroDocumento', width: 20 },
            { header: 'Telfono', key: 'telefono', width: 20 },
            { header: 'Sexo', key: 'sexo', width: 20 },
            // Agrega más columnas según sea necesario
        ];

        // Agregar datos de usuarios a las filas del worksheet
        users.forEach(user => {
            worksheet.addRow({
                username: user.username,
                role: user.role,
                nombres:user.nombres,
                apellidos:user.apellidos,
                tipoDocumento:user.tipoDocumento,
                numeroDocumento:user.numeroDocumento,
                telefono:user.telefono,
                sexo:user.sexo,
                // Agrega más campos de usuario según sea necesario
            });
        });

        // Configurar la respuesta HTTP con el tipo de contenido
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios.xlsx"');

        // Escribir el workbook en la respuesta HTTP
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};  
// Exportar multer upload para usarlo en las rutas
exports.upload = upload;