import config from '../config/index.js';

export function calcularCostoPieza(gramos, opciones = {}) {
    const costoPorGramo = opciones.costoPorGramo || config.negocio.costoPorGramo;
    const margenPorcentaje = opciones.margenGanancia || config.negocio.margenGanancia;
    const tiempoImpresion = opciones.tiempoImpresion || 0;
    const costoPorHora = opciones.costoPorHora || 0.5;

    if (typeof gramos !== 'number' || gramos <= 0) {
        throw new Error('Los gramos deben ser un número positivo');
    }

    const costoMaterial = gramos * costoPorGramo;
    const costoMaquina = tiempoImpresion * costoPorHora;
    const costoBase = costoMaterial + costoMaquina;
    const margen = costoBase * (margenPorcentaje / 100);
    const precioFinal = costoBase + margen;
    const redondear = (n) => Math.round(n * 100) / 100;

    return {
        gramos,
        costoMaterial: redondear(costoMaterial),
        costoMaquina: redondear(costoMaquina),
        costoBase: redondear(costoBase),
        margenPorcentaje,
        margen: redondear(margen),
        precioFinal: redondear(precioFinal),
    };
}

export function formatearCalculo(calculo, moneda = '$') {
    return `📊 Cálculo: ${calculo.gramos}g → ${moneda}${calculo.precioFinal}`;
}

export default { calcularCostoPieza, formatearCalculo };
