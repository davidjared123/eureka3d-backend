import styles from './ayuda.module.css';

export const metadata = {
    title: 'Ayuda - Eureka3D Dashboard',
    description: 'Guía de configuración y uso del bot de WhatsApp',
};

export default function AyudaPage() {
    return (
        <div className={styles.container}>
            <a href="/dashboard" className={styles.backBtn}>
                ← Volver al Dashboard
            </a>

            <div className={styles.header}>
                <h1>📚 Centro de Ayuda</h1>
                <p>Todo lo que necesitas saber para usar Eureka3D Bot</p>
            </div>

            {/* Quick Start */}
            <section className={styles.section}>
                <h2>🚀 Inicio Rápido</h2>
                <div className={styles.steps}>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>1</div>
                        <h3>Configura Trello</h3>
                        <p>Conecta tu tablero de Trello con las credenciales API</p>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>2</div>
                        <h3>Conecta WhatsApp</h3>
                        <p>Escanea el código QR con tu teléfono</p>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>3</div>
                        <h3>Elige un Grupo</h3>
                        <p>Crea o selecciona el grupo de pedidos</p>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>4</div>
                        <h3>¡Listo!</h3>
                        <p>Empieza a recibir pedidos automáticamente</p>
                    </div>
                </div>
            </section>

            {/* Trello Setup */}
            <section className={styles.section}>
                <h2>📋 Configurar Trello</h2>

                <div className={styles.accordion}>
                    <details className={styles.accordionItem}>
                        <summary>¿Cómo obtengo mi API Key de Trello?</summary>
                        <div className={styles.accordionContent}>
                            <ol>
                                <li>Ve a <a href="https://trello.com/power-ups/admin" target="_blank" rel="noopener">trello.com/power-ups/admin</a></li>
                                <li>Inicia sesión si te lo pide</li>
                                <li>Haz click en "Nueva" para crear una integración</li>
                                <li>Dale un nombre (ej: "Eureka3D")</li>
                                <li>Copia la <strong>API Key</strong> que aparece</li>
                            </ol>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Cómo obtengo mi Token de Trello?</summary>
                        <div className={styles.accordionContent}>
                            <ol>
                                <li>En la misma página donde está tu API Key</li>
                                <li>Al lado de "API Key" hay un enlace que dice <strong>"Token"</strong></li>
                                <li>Haz click en ese enlace</li>
                                <li>Autoriza la aplicación</li>
                                <li>Copia el token largo que aparece</li>
                            </ol>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Cómo encuentro el ID de mi tablero?</summary>
                        <div className={styles.accordionContent}>
                            <ol>
                                <li>Abre tu tablero de Trello en el navegador</li>
                                <li>La URL se ve así: <code>https://trello.com/b/ABC123/nombre</code></li>
                                <li>Añade <code>.json</code> al final: <code>https://trello.com/b/ABC123/nombre.json</code></li>
                                <li>Presiona Enter</li>
                                <li>Al inicio del texto, busca <code>"id":"XXXXXX"</code></li>
                                <li>Ese <code>XXXXXX</code> es tu Board ID</li>
                            </ol>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Cómo encuentro el ID de la lista de Pedidos?</summary>
                        <div className={styles.accordionContent}>
                            <ol>
                                <li>En el mismo JSON del paso anterior</li>
                                <li>Busca la sección <code>"lists":</code></li>
                                <li>Encuentra la lista llamada "Pedidos"</li>
                                <li>Copia el <code>"id"</code> de esa lista</li>
                            </ol>
                            <p><strong>Tip:</strong> Usa Ctrl+F para buscar "Pedidos" en el JSON</p>
                        </div>
                    </details>
                </div>
            </section>

            {/* WhatsApp */}
            <section className={styles.section}>
                <h2>📱 WhatsApp</h2>

                <div className={styles.accordion}>
                    <details className={styles.accordionItem}>
                        <summary>¿Cómo escaneo el código QR?</summary>
                        <div className={styles.accordionContent}>
                            <ol>
                                <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
                                <li>Toca el menú (⋮) o Configuración (⚙️)</li>
                                <li>Selecciona <strong>"Dispositivos vinculados"</strong></li>
                                <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                                <li>Apunta la cámara al código QR en tu pantalla</li>
                                <li>Espera a que se conecte (~5 segundos)</li>
                            </ol>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Puedo usar mi número personal?</summary>
                        <div className={styles.accordionContent}>
                            <p>Sí, puedes usar cualquier número de WhatsApp. Sin embargo:</p>
                            <ul>
                                <li>✅ El bot solo responde en el grupo configurado</li>
                                <li>✅ Tus chats personales no se ven afectados</li>
                                <li>💡 Recomendamos un número dedicado al negocio para mayor organización</li>
                            </ul>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Qué pasa si desconecto WhatsApp?</summary>
                        <div className={styles.accordionContent}>
                            <p>Si tu teléfono pierde conexión a internet o desvincula el dispositivo:</p>
                            <ul>
                                <li>El bot dejará de funcionar temporalmente</li>
                                <li>Cuando vuelvas a tener internet, el bot se reconecta automáticamente</li>
                                <li>Si desvinculaste manualmente, necesitarás escanear el QR de nuevo</li>
                            </ul>
                        </div>
                    </details>
                </div>
            </section>

            {/* Commands */}
            <section className={styles.section}>
                <h2>💬 Comandos del Bot</h2>

                <div className={styles.commandsTable}>
                    <table>
                        <thead>
                            <tr>
                                <th>Comando</th>
                                <th>Descripción</th>
                                <th>Ejemplo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>#info</code></td>
                                <td>Ver todos los pedidos pendientes</td>
                                <td>#info</td>
                            </tr>
                            <tr>
                                <td><code>#info hoy</code></td>
                                <td>Pedidos para entregar hoy</td>
                                <td>#info hoy</td>
                            </tr>
                            <tr>
                                <td><code>#info semana</code></td>
                                <td>Pedidos de esta semana</td>
                                <td>#info semana</td>
                            </tr>
                            <tr>
                                <td><code>sí</code> / <code>si</code></td>
                                <td>Confirmar una acción</td>
                                <td>sí</td>
                            </tr>
                            <tr>
                                <td><code>no</code> / <code>cancelar</code></td>
                                <td>Cancelar pedido actual</td>
                                <td>cancelar</td>
                            </tr>
                            <tr>
                                <td><code>otro</code></td>
                                <td>Cambiar el título sugerido</td>
                                <td>otro</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* How it works */}
            <section className={styles.section}>
                <h2>⚙️ ¿Cómo funciona?</h2>

                <div className={styles.flowDiagram}>
                    <div className={styles.flowStep}>
                        <span className={styles.flowIcon}>💬</span>
                        <span>Mensaje en WhatsApp</span>
                    </div>
                    <div className={styles.flowArrow}>→</div>
                    <div className={styles.flowStep}>
                        <span className={styles.flowIcon}>🤖</span>
                        <span>Bot procesa</span>
                    </div>
                    <div className={styles.flowArrow}>→</div>
                    <div className={styles.flowStep}>
                        <span className={styles.flowIcon}>📋</span>
                        <span>Tarjeta en Trello</span>
                    </div>
                </div>

                <div className={styles.flowDescription}>
                    <p>
                        Cuando envías un mensaje al grupo configurado, el bot inicia una conversación
                        para recopilar los detalles del pedido: título, descripción, imágenes y fecha de entrega.
                        Una vez confirmado, crea automáticamente una tarjeta en tu tablero de Trello.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className={styles.section}>
                <h2>❓ Preguntas Frecuentes</h2>

                <div className={styles.accordion}>
                    <details className={styles.accordionItem}>
                        <summary>¿Cuántos pedidos puedo recibir?</summary>
                        <div className={styles.accordionContent}>
                            <p>¡Ilimitados! El bot procesa todos los mensajes sin límite.</p>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Puedo adjuntar fotos a los pedidos?</summary>
                        <div className={styles.accordionContent}>
                            <p>¡Sí! Envía fotos en el grupo y se adjuntan automáticamente como referencia en la tarjeta de Trello.</p>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Qué pasa con los mensajes en otros grupos o privados?</summary>
                        <div className={styles.accordionContent}>
                            <p>El bot <strong>solo</strong> procesa mensajes del grupo configurado. Tus otros chats no se ven afectados.</p>
                        </div>
                    </details>

                    <details className={styles.accordionItem}>
                        <summary>¿Puedo usar varios grupos?</summary>
                        <div className={styles.accordionContent}>
                            <p>Actualmente cada cuenta puede configurar un grupo. Para múltiples grupos, contacta a soporte.</p>
                        </div>
                    </details>
                </div>
            </section>

            {/* Support */}
            <section className={styles.section}>
                <h2>🆘 ¿Necesitas más ayuda?</h2>
                <div className={styles.supportCard}>
                    <p>Si tienes dudas o problemas, estamos aquí para ayudarte:</p>
                    <div className={styles.supportButtons}>
                        <a href="mailto:soporte@eureka3d.com" className="btn btn-primary">
                            📧 Enviar Email
                        </a>
                        <a href="https://wa.me/584121234567" target="_blank" className="btn btn-secondary">
                            💬 WhatsApp Soporte
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
