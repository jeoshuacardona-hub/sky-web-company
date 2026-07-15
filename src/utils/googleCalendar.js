const { google } = require('googleapis');
const User = require('../models/User');

const getOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );
};

// Generar URL de autenticación para Google
exports.getAuthUrl = () => {
    const oauth2Client = getOAuthClient();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar']
    });
};

// Guardar tokens obtenidos tras callback
exports.saveTokens = async (userId, code) => {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    const updateData = {
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: new Date(tokens.expiry_date),
        updatedAt: Date.now()
    };
    
    // El refresh token solo se envía en la primera autorización
    if (tokens.refresh_token) {
        updateData.googleRefreshToken = tokens.refresh_token;
    }
    
    await User.findByIdAndUpdate(userId, updateData);
    return tokens;
};

// Obtener un cliente de Google Calendar autorizado para un usuario
async function getAuthorizedClient(userId) {
    const user = await User.findById(userId);
    if (!user || !user.googleRefreshToken) {
        throw new Error('Google Calendar no está vinculado.');
    }
    
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
        expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : null
    });
    
    // Si el token expiró o expira pronto (menos de 5 minutos), refrescarlo
    const isExpired = !user.googleTokenExpiry || (user.googleTokenExpiry.getTime() - Date.now() < 300000);
    if (isExpired) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            user.googleAccessToken = credentials.access_token;
            if (credentials.expiry_date) {
                user.googleTokenExpiry = new Date(credentials.expiry_date);
            }
            await user.save();
        } catch (err) {
            console.error('Error refrescando token de Google:', err);
            throw new Error('Error de autenticación con Google. Vincula tu cuenta de nuevo.');
        }
    }
    
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Convertir fecha y hora en formato ISO string
function parseEventTimes(date, timeStr) {
    // Normalizar la fecha a YYYY-MM-DD
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    const parts = timeStr.split(' - ');
    const startStr = parts[0];
    const endStr = parts[1] || '';
    
    const startDateTime = new Date(`${dateStr}T${startStr}:00`);
    
    let endDateTime;
    if (endStr) {
        endDateTime = new Date(`${dateStr}T${endStr}:00`);
        if (endDateTime <= startDateTime) {
            endDateTime.setDate(endDateTime.getDate() + 1);
        }
    } else {
        endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);
    }
    
    return {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
    };
}

// Crear un evento con Meet
exports.createCalendarEvent = async (adminUserId, meeting) => {
    try {
        const calendar = await getAuthorizedClient(adminUserId);
        const { start, end } = parseEventTimes(meeting.date, meeting.time);
        
        const eventResource = {
            summary: meeting.title,
            description: meeting.description || 'Reunión agendada en la plataforma Sky Web Company',
            start: { dateTime: start },
            end: { dateTime: end },
            conferenceData: {
                createRequest: {
                    requestId: `meet-${meeting._id}-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutMeet' }
                }
            }
        };
        
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: eventResource,
            conferenceDataVersion: 1
        });
        
        return {
            eventId: response.data.id,
            meetLink: response.data.hangoutLink || ''
        };
    } catch (err) {
        console.error('createCalendarEvent error:', err);
        return null;
    }
};

// Actualizar un evento existente
exports.updateCalendarEvent = async (adminUserId, meeting) => {
    if (!meeting.googleEventId) return null;
    try {
        const calendar = await getAuthorizedClient(adminUserId);
        const { start, end } = parseEventTimes(meeting.date, meeting.time);
        
        const eventResource = {
            summary: meeting.title,
            description: meeting.description || 'Reunión agendada en la plataforma Sky Web Company',
            start: { dateTime: start },
            end: { dateTime: end }
        };
        
        await calendar.events.patch({
            calendarId: 'primary',
            eventId: meeting.googleEventId,
            resource: eventResource
        });
        return true;
    } catch (err) {
        console.error('updateCalendarEvent error:', err);
        return false;
    }
};

// Eliminar un evento
exports.deleteCalendarEvent = async (adminUserId, googleEventId) => {
    if (!googleEventId) return false;
    try {
        const calendar = await getAuthorizedClient(adminUserId);
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId
        });
        return true;
    } catch (err) {
        console.error('deleteCalendarEvent error:', err);
        return false;
    }
};
