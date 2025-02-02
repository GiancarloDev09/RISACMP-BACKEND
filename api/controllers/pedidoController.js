// controllers/pedidoController.js
const Pedido = require("../models/Pedido");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const ProductoModel = require("../models/Producto");
const UnidadMedidaModel = require("../models/UnidadMedidaModel");

exports.registerPedido = async (req, res) => {
  const { nombreCliente, estadoPedido, observacion, productos } = req.body;

  try {
    // Obtener el último código de pedido registrado
    const lastPedido = await Pedido.findOne().sort({ codigoPedido: -1 });

    let nextCodigoPedido = 1;
    if (lastPedido) {
      // Si hay pedidos previos, incrementar el código
      const lastNumero = parseInt(lastPedido.codigoPedido.split('-')[1]);
      nextCodigoPedido = lastNumero + 1;
    }

    const nuevoCodigoPedido = `PEDIDO-${nextCodigoPedido}`;

    const nuevoPedido = new Pedido({
      codigoPedido: nuevoCodigoPedido,
      nombreCliente,
      estadoPedido,
      observacion,
      productos,
    });

    await nuevoPedido.save();

    res.status(201).json({ codigoPedido: nuevoCodigoPedido, msg: "Pedido registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar el pedido:", error);
    res.status(500).json({ error: "Error del servidor al registrar el pedido" });
  }
};

exports.getAllPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.find();
    res.json(pedidos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.exportPedidosToExcel = async (req, res) => {
  try {
    const pedidos = await Pedido.find();

    // Crear un nuevo workbook de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheetPedidos = workbook.addWorksheet("Pedidos");

    // Definir las cabeceras de las columnas para Pedidos
    worksheetPedidos.columns = [
      { header: "Codigo Pedido", key: "codigoPedido", width: 15 },
      { header: "Nombre Cliente", key: "nombreCliente", width: 30 },
      { header: "Fecha Pedido", key: "fechaPedido", width: 20 },
      { header: "Estado Pedido", key: "estadoPedido", width: 20 },
      { header: "Codigo Producto", key: "codigoProducto", width: 20 },
      { header: "Cantidad", key: "cantidad", width: 15 },
      { header: "Observacion", key: "observacion", width: 30 },
    ];

    // Agregar los datos de los pedidos al worksheet
    pedidos.forEach(pedido => {
      worksheetPedidos.addRow({
        codigoPedido: pedido.codigoPedido,
        nombreCliente: pedido.nombreCliente,
        fechaPedido: pedido.fechaPedido,
        estadoPedido: pedido.estadoPedido,
        codigoProducto: pedido.productos.map(prod => prod.producto_id).join(", "),
        cantidad: pedido.productos.length, // Ajustar según la estructura real de productos
        observacion: pedido.observacion,
      });
    });

    // Generar el archivo Excel
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="pedidos.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.exportPedidosToPDF = async (req, res) => {
  try {
    const pedidos = await Pedido.find();

    // Crear un nuevo documento PDF
    const doc = new PDFDocument();

    // Configurar la respuesta HTTP con el tipo de contenido
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pedidos.pdf"'
    );

    // Pipe el documento PDF directamente a la respuesta HTTP
    doc.pipe(res);

    // Agregar contenido al documento PDF
    doc.font('Helvetica-Bold').fontSize(20).text("Lista de Pedidos", { align: "center" });
    doc.moveDown();

    pedidos.forEach((pedido) => {
      doc.font('Helvetica-Bold').fontSize(14).text(`Código Pedido: ${pedido.codigoPedido}`);
      doc.font('Helvetica').fontSize(12).text(`Nombre Cliente: ${pedido.nombreCliente}`);
      doc.font('Helvetica').fontSize(12).text(`Fecha Pedido: ${pedido.fechaPedido}`);
      doc.font('Helvetica').fontSize(12).text(`Estado Pedido: ${pedido.estadoPedido}`);
      doc.font('Helvetica').fontSize(12).text(`Código Producto: ${pedido.productos.map(prod => prod.producto_id).join(", ")}`);
      doc.font('Helvetica').fontSize(12).text(`Cantidad: ${pedido.productos.length}`); // Ajustar según la estructura real de productos
      doc.font('Helvetica').fontSize(12).text(`Observación: ${pedido.observacion}`);
      doc.moveDown();
    });

    // Finaliza el documento PDF
    doc.end();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updatePedidoById = async (req, res) => {
  const { id } = req.params;
  const { codigoPedido, nombreCliente, fechaPedido, estadoPedido, productos, observacion } = req.body;

  try {
    let pedido = await Pedido.findById(id);

    if (!pedido) {
      return res.status(404).json({ msg: "Pedido not found" });
    }

    // Validar productos antes de actualizar
    let validacion;
    for (let producto of productos) {
      validacion = await ProductoModel.findById(producto.producto_id);
      if (!validacion) {
        return res.status(400).json({ msg: `El producto de id ${producto.producto_id} no existe` });
      }
      validacion = await UnidadMedidaModel.findById(producto.unidad_medida_id);
      if (!validacion) {
        return res.status(400).json({ msg: `La unidad de medida del producto de id ${producto.producto_id} no existe` });
      }
    }

    // Actualizar pedido con los nuevos datos
    pedido.codigoPedido = codigoPedido || pedido.codigoPedido;
    pedido.nombreCliente = nombreCliente || pedido.nombreCliente;
    pedido.fechaPedido = fechaPedido || pedido.fechaPedido;
    pedido.estadoPedido = estadoPedido || pedido.estadoPedido;
    pedido.productos = productos || pedido.productos;
    pedido.observacion = observacion || pedido.observacion;

    await pedido.save();

    res.json({ msg: "Pedido updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getPedidoById = async (req, res) => {
  const { id } = req.params;

  try {
    const pedido = await Pedido.findById(id);

    if (!pedido) {
      return res.status(404).json({ msg: "Pedido not found" });
    }

    res.json(pedido);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.eliminarOrdenTrabajo = async (req, res) => {
  try {
      const { id } = req.params;
      const pedido = await Pedido.findByIdAndDelete(id);
      if (!pedido) {
          return res.status(404).json({ message: "Pedido no encontrado" });
      }
      res.status(200).json({ message: "Pedido eliminado exitosamente" });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
}